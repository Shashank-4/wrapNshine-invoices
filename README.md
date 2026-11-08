# Wrap N Shine Invoice Studio

A static web app for creating single-service Wrap N Shine invoices. The printable PDF preserves the supplied A4 template, logo, business details and totals layout. Customer details and generated PDFs stay on the device until the operator chooses to share them. The template in this repo has had the sample invoice values permanently removed.

## Run locally

From the repository root, run `python3 -m http.server 8000 --directory dist` and open http://localhost:8000. No package install or build step is required.

## Create an invoice

Enter your own unique invoice number, date, customer and vehicle details, service description, price and discount. Quantity stays at one and the discount is a rupee amount. The app calculates totals and spells out the payable amount. The generated PDF supports Latin-script text and common punctuation.

Download the PDF or choose **Share to WhatsApp** and select WhatsApp in the device share menu. File sharing requires HTTPS and a compatible browser and device. If file sharing is unavailable, the button downloads the PDF so you can attach it as a WhatsApp document. The app has no server-side invoice history or automatic invoice numbering.

## Free hosting on Cloudflare Pages

1. Push this Git repository to a GitHub or GitLab repository you control. It can be private.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Set the production branch to `main`, leave the build command blank, set the output directory to `dist`, and deploy.
4. Open the provided HTTPS URL. Future pushes to the production branch deploy automatically.

The app needs no environment variables or backend. The default Pages URL serves the app publicly, so anyone with the link can open the blank form. The Git repository and static site contain the studio's printed business details.

[Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
