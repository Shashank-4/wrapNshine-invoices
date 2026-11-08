import { exportInvoice, formatMoney, invoiceLayout, parseMoney } from './invoice.mjs';

const form = document.querySelector('#invoice-form');
const preview = document.querySelector('#preview-text');
const totalLabel = document.querySelector('#total');
const status = document.querySelector('#status');
const download = document.querySelector('#download');
const share = document.querySelector('#share');
const controls = [...form.elements].filter(control => control.name);
const svgNs = 'http://www.w3.org/2000/svg';
const pdfLib = window.PDFLib;
const today = new Date();
form.elements.date.value = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
  .map(value => String(value).padStart(2, '0')).join('-');

let revision = 0;
let readyFile;
let timer;

function setReady(file) {
  readyFile = file;
  download.disabled = share.disabled = !file;
}

function saveFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (readyFile) download.click();
});

download.addEventListener('click', () => {
  if (!readyFile) return;
  saveFile(readyFile);
  status.textContent = 'PDF download started.';
});

share.addEventListener('click', async () => {
  const file = readyFile;
  if (!file) return;
  const data = { files: [file] };
  if (navigator.canShare?.(data) && navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  saveFile(file);
  status.textContent = 'PDF downloaded for sharing. Open WhatsApp and attach it as a document.';
});

function drawPreview(text) {
  preview.replaceChildren(...text.map(row => {
    const node = document.createElementNS(svgNs, 'text');
    node.setAttribute('x', row.x);
    node.setAttribute('y', row.y);
    node.setAttribute('font-size', row.size);
    node.setAttribute('fill', row.color);
    if (row.bold) node.setAttribute('font-weight', 'bold');
    node.textContent = row.value;
    return node;
  }));
}

async function initialize() {
  const [response, metrics] = await Promise.all([
    fetch('./invoice-template.pdf'), pdfLib.PDFDocument.create(),
  ]);
  if (!response.ok) throw new Error('Template unavailable');
  const [template, regular, bold] = await Promise.all([
    response.arrayBuffer(),
    metrics.embedFont(pdfLib.StandardFonts.Helvetica),
    metrics.embedFont(pdfLib.StandardFonts.HelveticaBold),
  ]);

  function update() {
    const current = ++revision;
    clearTimeout(timer);
    setReady(undefined);
    const values = {};
    for (const control of controls) {
      control.setCustomValidity('');
      const value = control.value.trim().replace(/\s+/g, ' ');
      try {
        regular.encodeText(value);
        bold.encodeText(value);
        values[control.name] = value;
      } catch {
        values[control.name] = '';
        control.setCustomValidity('Use Latin letters, numbers and common punctuation in PDF fields.');
      }
    }

    for (const key of ['price', 'discount']) {
      const input = values[key];
      values[key] = key === 'discount' && !input ? 0 : parseMoney(input);
      if (input && values[key] === null) {
        form.elements[key].setCustomValidity('Enter an amount up to 9999999.99 with no commas and up to two decimal places.');
      }
    }
    values.total = null;
    if (values.price !== null && values.discount !== null) {
      if (values.discount > values.price) {
        form.elements.discount.setCustomValidity('Discount cannot exceed the price.');
      } else {
        values.total = values.price - values.discount;
      }
    }

    totalLabel.textContent = values.total === null ? '—' : '₹' + formatMoney(values.total);
    const text = invoiceLayout(values, { regular, bold });
    drawPreview(text);
    const invalid = controls.find(control => control.validity.customError || (!control.validity.valid && control.value));
    if (invalid) {
      status.textContent = invalid.validationMessage;
      return;
    }
    if (controls.some(control => control.required && !control.value.trim())) {
      status.textContent = 'Complete the required fields to export.';
      return;
    }

    status.textContent = 'Preparing PDF…';
    timer = setTimeout(async () => {
      try {
        const bytes = await exportInvoice(pdfLib, template, text);
        if (current !== revision) return;
        const filename = values.number.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
        setReady(new File([bytes], (filename || 'wrap-n-shine-invoice') + '.pdf', { type: 'application/pdf' }));
        status.textContent = navigator.canShare?.({ files: [readyFile] })
          ? 'Choose WhatsApp in the share menu.'
          : 'If your browser cannot share files, the PDF downloads for manual attachment.';
      } catch (error) {
        if (current === revision) status.textContent = 'Could not prepare the PDF. Change a field to try again.';
        console.error(error);
      }
    }, 120);
  }

  form.addEventListener('input', update);
  update();
}

initialize().catch(error => {
  status.textContent = 'Could not load the invoice template. Reload to try again.';
  console.error(error);
});
