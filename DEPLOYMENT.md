# Three Kings Water Refilling Station Deployment

This project is now a static Netlify website. It no longer uses Express, MySQL, admin login, admin dashboard, sessions, or database-backed order management.

Forms are powered by Netlify Functions:
- The order form sends an email to the owner.
- The contact form sends an email to the owner.
- No database records are saved.

## Local Setup

1. Run `npm install`.
2. Run `npx netlify dev`.
3. Open the local Netlify URL shown in the terminal.
4. Test the order form and contact form.

## Netlify Environment Variables

Add these in Netlify before testing live forms:

```env
OWNER_EMAIL=owner@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=owner@example.com
SMTP_PASS=your_gmail_app_password
MAIL_FROM="Three Kings Water Refilling Station <owner@example.com>"
```

Do not place SMTP passwords or Gmail App Passwords in frontend JavaScript.

## Deploy

1. Connect the project to Netlify.
2. Confirm the publish directory is `.`.
3. Confirm the functions directory is `netlify/functions`.
4. Add the required environment variables.
5. Deploy.
6. Test the order form and contact form after deployment.
7. Check the owner email inbox and spam folder.

## Safety Notes

- Do not upload `node_modules` to GitHub.
- Do not upload `.env` to GitHub.
- If a Gmail App Password was ever shared, committed, or exposed, rotate it.
- Compress large images before deployment.
- Make sure image paths match exactly, especially `Images/` vs `images/`.
- Keep `robots.txt`.
- Confirm business phone numbers, address, operating hours, map, and Messenger link are correct.
- Confirm there are no links to `/admin/login`, `/admin/dashboard`, `/api/orders`, `/api/contact`, `localhost`, or port `3000`.
- Confirm the browser console has no 404 errors after deployment.
- Confirm the site works on mobile.

## Privacy And Anti-Spam

Cookies/localStorage are only used for:
- remembering the cookie notice choice
- temporary submit cooldown
- basic anti-spam behavior

They are not used for:
- saving customer orders
- saving contact messages
- tracking users
- admin login
- database storage

If spam becomes a problem later, add a free CAPTCHA or Turnstile-style check before sending email.
