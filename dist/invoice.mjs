const integerFormat = new Intl.NumberFormat('en-IN');
const small = 'Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen'.split(' ');
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export function parseMoney(input) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function formatMoney(paise) {
  return integerFormat.format(Math.floor(paise / 100)) + '.' + String(paise % 100).padStart(2, '0');
}

function integerWords(number) {
  if (number < 20) return small[number];
  if (number < 100) return tens[Math.floor(number / 10)] + (number % 10 ? ' ' + small[number % 10] : '');
  const [unit, label] = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']]
    .find(([size]) => number >= size);
  const rest = number % unit;
  return integerWords(Math.floor(number / unit)) + ' ' + label + (rest ? ' ' + integerWords(rest) : '');
}

function amountWords(paise) {
  const fraction = paise % 100;
  const rupees = 'Rupees ' + integerWords(Math.floor(paise / 100));
  return rupees + (fraction ? ' and ' + integerWords(fraction) + ' Paise' : '') + ' Only';
}

export function invoiceLayout(values, fonts) {
  const text = [];
  const ink = '#1a1a2e';
  function line(value, x, y, size, { bold = false, align = 'left', color = ink, maxWidth = Infinity } = {}) {
    if (!value) return;
    const font = bold ? fonts.bold : fonts.regular;
    const naturalWidth = font.widthOfTextAtSize(value, size);
    const width = Math.min(naturalWidth, maxWidth);
    if (align === 'right') x -= width;
    if (align === 'center') x -= width / 2;
    text.push({ value, x, y, size: size * width / naturalWidth, bold, color });
  }

  function heading(label, value, y) {
    line(label, 543.68 - fonts.bold.widthOfTextAtSize(value, 8.25), y, 8.25, { align: 'right' });
    line(value, 543.68, y, 8.25, { bold: true, align: 'right' });
  }

  heading('Invoice No. ', values.number, 88.88);
  heading('Invoice Date ', values.date.split('-').reverse().join('-'), 102.22);
  line(values.customer, 51.6, 198.83, 8.25, { bold: true, maxWidth: 248 });
  line(values.address, 51.6, 211.89, 8.25, { maxWidth: 248 });
  for (const [label, key, y] of [
    ['MOB', 'mobile', 225.09], ['PLACE', 'place', 238.29], ['VEHICLE MODEL', 'model', 251.49],
    ['VEHICLE REG NO', 'registration', 264.69],
  ]) {
    if (values[key]) line(label + ': ' + values[key], 51.6, y, 8.25, { maxWidth: 248 });
  }

  line(values.service, 57.6, 343.65, 9.75, { bold: true, maxWidth: 165 });
  if (values.notes) {
    const words = values.notes.split(/\s+/);
    const fullWidth = fonts.regular.widthOfTextAtSize(values.notes, 6.75);
    if (fullWidth <= 165) {
      line(values.notes, 57.6, 352.46, 6.75, { color: '#5a6a7e' });
    } else {
      let split = 1;
      while (split < words.length - 1 && fonts.regular.widthOfTextAtSize(words.slice(0, split).join(' '), 6.75) < fullWidth / 2) {
        split += 1;
      }
      line(words.slice(0, split).join(' '), 57.6, 352.46, 6.75, { color: '#5a6a7e', maxWidth: 165 });
      line(words.slice(split).join(' '), 57.6, 360.56, 6.75, { color: '#5a6a7e', maxWidth: 165 });
    }
  }

  if (values.price !== null) line(formatMoney(values.price), 253.35, 343.49, 9.75, { align: 'center' });
  if (values.total !== null) {
    const net = formatMoney(values.total);
    line(net, 537.68, 343.65, 9.75, { align: 'right', bold: true });
    const discount = values.discount % 100 ? (values.discount / 100).toFixed(2) : String(values.discount / 100);
    line('DISCOUNT: ' + discount, 537.68, 352.46, 6.75, { align: 'right', color: '#2a7a3a' });
    line(formatMoney(values.discount), 541.36, 392.9, 8.25, { align: 'right' });
    line(net, 541.36, 405.95, 8.25, { align: 'right' });
    line(net, 541.36, 421.92, 11.25, { align: 'right', bold: true, color: '#000000' });
    line(amountWords(values.total), 51.6, 423.56, 8.25, { bold: true, maxWidth: 327 });
  }
  return text;
}

export async function exportInvoice(pdfLib, template, text) {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.load(template);
  const [regular, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  const page = doc.getPage(0);
  for (const row of text) {
    const hex = Number.parseInt(row.color.slice(1), 16);
    page.drawText(row.value, {
      x: row.x, y: page.getHeight() - row.y, size: row.size, font: row.bold ? bold : regular,
      color: rgb((hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255),
    });
  }
  doc.setTitle('Wrap N Shine Invoice');
  return doc.save();
}
