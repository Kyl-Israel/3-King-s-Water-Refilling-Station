const nodemailer = require("nodemailer");

const ORDER_SUCCESS_MESSAGE = "Thank you! Your order request has been sent. We will contact you shortly.";
const FULFILLMENT_OPTIONS = ["Delivery", "Pickup"];

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeText = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
};

const isTooLong = (value, maxLength) => typeof value === "string" && value.trim().length > maxLength;

const parseBoolean = (value) => String(value || "true").toLowerCase() === "true";

const getDeliveryMapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

const parseJsonBody = (body) => {
  try {
    return JSON.parse(body || "{}");
  } catch (error) {
    return null;
  }
};

const hasMailConfig = () =>
  Boolean(
    process.env.OWNER_EMAIL &&
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: parseBoolean(process.env.SMTP_SECURE),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const validateOrder = (payload) => {
  if (
    isTooLong(payload.name, 120) ||
    isTooLong(payload.contact, 40) ||
    isTooLong(payload.address, 300) ||
    isTooLong(payload.time, 80) ||
    isTooLong(payload.deliveryLat || "", 32) ||
    isTooLong(payload.deliveryLng || "", 32) ||
    isTooLong(payload.notes || "", 1000) ||
    isTooLong(payload.website || "", 120)
  ) {
    return { error: "One or more fields are too long." };
  }

  const order = {
    name: normalizeText(payload.name, 120),
    contact: normalizeText(payload.contact, 40),
    address: normalizeText(payload.address, 300),
    gallons: Number(payload.gallons),
    fulfillment: normalizeText(payload.fulfillment, 20),
    date: normalizeText(payload.date, 20),
    time: normalizeText(payload.time, 80),
    deliveryLat: normalizeText(payload.deliveryLat || "", 32),
    deliveryLng: normalizeText(payload.deliveryLng || "", 32),
    deliveryMapLink: "",
    notes: normalizeText(payload.notes || "", 1000),
    website: normalizeText(payload.website || "", 120),
  };

  if (order.website) {
    return { silentlyIgnored: true };
  }

  if (!order.name || !order.contact || !order.address || !order.date || !order.time) {
    return { error: "Please complete the required order fields." };
  }

  if (!Number.isFinite(order.gallons) || order.gallons < 1) {
    return { error: "Please enter a valid number of gallons." };
  }

  if (!FULFILLMENT_OPTIONS.includes(order.fulfillment)) {
    return { error: "Please choose Delivery or Pickup." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.date)) {
    return { error: "Please choose a valid preferred date." };
  }

  if (order.deliveryLat || order.deliveryLng) {
    if (!order.deliveryLat || !order.deliveryLng) {
      return { error: "Please choose a valid delivery location pin." };
    }

    const deliveryLat = Number(order.deliveryLat);
    const deliveryLng = Number(order.deliveryLng);

    if (
      !Number.isFinite(deliveryLat) ||
      !Number.isFinite(deliveryLng) ||
      deliveryLat < -90 ||
      deliveryLat > 90 ||
      deliveryLng < -180 ||
      deliveryLng > 180
    ) {
      return { error: "Please choose a valid delivery location pin." };
    }

    order.deliveryLat = deliveryLat.toFixed(6);
    order.deliveryLng = deliveryLng.toFixed(6);
    order.deliveryMapLink = getDeliveryMapLink(order.deliveryLat, order.deliveryLng);
  }

  return { order };
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Only POST requests are allowed." });
  }

  const payload = parseJsonBody(event.body);
  if (!payload) {
    return jsonResponse(400, { message: "Invalid JSON body." });
  }

  const { order, error, silentlyIgnored } = validateOrder(payload);
  if (silentlyIgnored) {
    return jsonResponse(200, { message: ORDER_SUCCESS_MESSAGE });
  }

  if (error) {
    return jsonResponse(400, { message: error });
  }

  if (!hasMailConfig()) {
    return jsonResponse(503, { message: "Email service is not configured yet." });
  }

  const submittedAt = new Date().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
  const notes = order.notes || "None";
  const deliveryPin = order.deliveryMapLink || "Not provided";
  const deliveryPinHtml = order.deliveryMapLink
    ? `<a href="${escapeHtml(order.deliveryMapLink)}" style="color: #1d7fcc; font-weight: 700;">Open delivery pin in Google Maps</a>`
    : "Not provided";

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: process.env.OWNER_EMAIL,
      subject: "New Water Order Request - Three Kings",
      text: [
        "A new water order request was sent from the website.",
        "",
        `Customer name: ${order.name}`,
        `Contact number: ${order.contact}`,
        `Address: ${order.address}`,
        `Number of gallons: ${order.gallons}`,
        `Delivery or pickup: ${order.fulfillment}`,
        `Preferred date: ${order.date}`,
        `Preferred time: ${order.time}`,
        `Delivery pin: ${deliveryPin}`,
        `Notes: ${notes}`,
        `Submitted: ${submittedAt}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #16385d; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">New Water Order Request</h2>
          <p style="margin-top: 0;">A customer sent an order request from the website.</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
            <tbody>
              <tr><td style="padding: 8px 0; font-weight: 700;">Customer name</td><td style="padding: 8px 0;">${escapeHtml(order.name)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Contact number</td><td style="padding: 8px 0;">${escapeHtml(order.contact)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Address</td><td style="padding: 8px 0;">${escapeHtml(order.address)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Number of gallons</td><td style="padding: 8px 0;">${escapeHtml(order.gallons)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Delivery or pickup</td><td style="padding: 8px 0;">${escapeHtml(order.fulfillment)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Preferred date</td><td style="padding: 8px 0;">${escapeHtml(order.date)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Preferred time</td><td style="padding: 8px 0;">${escapeHtml(order.time)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Delivery pin</td><td style="padding: 8px 0;">${deliveryPinHtml}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Notes</td><td style="padding: 8px 0;">${escapeHtml(notes)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: 700;">Submitted</td><td style="padding: 8px 0;">${escapeHtml(submittedAt)}</td></tr>
            </tbody>
          </table>
        </div>
      `,
    });

    return jsonResponse(200, { message: ORDER_SUCCESS_MESSAGE });
  } catch (mailError) {
    console.error("Unable to send order email.", mailError);
    return jsonResponse(500, { message: "Unable to send your order request right now." });
  }
};
