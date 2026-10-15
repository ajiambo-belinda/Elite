


// ========== 1. Small helpers  ==========
const $   = s => document.querySelector(s);
const kes = n => "KES " + Number(n).toLocaleString();
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// "09:00" -> "9:00 AM",  "21:00" -> "9:00 PM"
function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// "2026-10-14" -> "Wed, 14 Oct 2026"
function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}


function maskPhone(p) {
  if (!p) return "";
  const local = "0" + String(p).slice(-9);
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}


const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();


// ========== 2. Read the booking from the link ==========


function decodeTicket(code) {
  const base64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

let booking = null;
try { booking = decodeTicket(location.hash.slice(1)); } catch (e) { booking = null; }

// A booking is only usable if it has the main details
const isValid = b => b && b.ref && b.from && b.to && b.date && b.time && Array.isArray(b.seats) && b.passenger;


// ========== 3. The lines shown on the ticket ==========
const ticketRows = b => [
  ["Date",        formatDate(b.date)],
  ["Passenger",   b.passenger],
  ["Seats",       b.seats.join(", ")],
  ["Vehicle",     b.vehicle],
  ["Phone",       maskPhone(b.phone)],
  ["Amount paid", kes(b.amount)],
  ["M-Pesa code", b.mpesaCode],
  ["Paid on",     b.paidAt]
];


// ========== 4. Show the ticket on the page ==========
function showTicket(b) {
  document.title = `Ticket ${b.ref} - Elite Drive`;
  $("#ticketBox").innerHTML = `
    <div class="receipt-head">
      <h2>Elite Drive</h2>
      <div class="ref">${esc(b.ref)}</div>
    </div>
    <div class="route">${esc(b.from)} → ${esc(b.to)}</div>
    <div class="depart">Departs <b>${formatTime(b.time)}</b></div>
    <div class="receipt-body">
      ${ticketRows(b).map(([k, v]) => `<div class="receipt-row"><span>${k}</span><span>${esc(v)}</span></div>`).join("")}
    </div>
    <div class="receipt-foot">Show this ticket when boarding. Please arrive 30 minutes before departure.</div>`;
  $("#ticketActions").hidden = false;    

function showNotFound() {
  $("#ticketBox").innerHTML = `
    <div class="route">Ticket not found</div>
    <div class="receipt-body">
      <p class="meta">This link looks incomplete or broken. Check the message we sent you,
      or <a href="index.html#myTicket">find your ticket</a> with your reference and phone number.</p>
    </div>`;
}

if (isValid(booking)) showTicket(booking); else showNotFound();


// ========== 5. Draw the ticket as a picture (for Save and Share) ==========
function drawTicket(b) {
  const W = 600;
  const rows = ticketRows(b);
  const H = 330 + rows.length * 44 + 50;
  const font = "system-ui, sans-serif";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");

  // background
  g.fillStyle = css("--card");
  g.fillRect(0, 0, W, H);

  // brown header with the name and reference
  g.fillStyle = css("--brand");
  g.fillRect(0, 0, W, 110);
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.font = `bold 32px ${font}`;
  g.fillText("Elite Drive", W / 2, 48);
  g.font = `bold 26px ${font}`;
  g.fillText(b.ref, W / 2, 90);

  // route and big departure time
  g.fillStyle = css("--text");
  g.font = `bold 30px ${font}`;
  g.fillText(`${b.from} → ${b.to}`, W / 2, 170);
  g.fillStyle = css("--muted");
  g.font = `22px ${font}`;
  g.fillText("Departs", W / 2, 210);
  g.fillStyle = css("--heading");
  g.font = `bold 56px ${font}`;
  g.fillText(formatTime(b.time), W / 2, 270);

  // detail rows
  rows.forEach(([label, value], i) => {
    const y = 330 + i * 44;
    g.strokeStyle = css("--line");
    g.beginPath();
    g.moveTo(30, y + 12);
    g.lineTo(W - 30, y + 12);
    g.stroke();

    g.textAlign = "left";
    g.fillStyle = css("--muted");
    g.font = `20px ${font}`;
    g.fillText(label, 30, y);

    g.textAlign = "right";
    g.fillStyle = css("--text");
    g.font = `bold 20px ${font}`;
    g.fillText(String(value), W - 30, y);
  });

  // footer line
  g.textAlign = "center";
  g.fillStyle = css("--muted");
  g.font = `18px ${font}`;
  g.fillText("Show this ticket when boarding.", W / 2, H - 22);

  return canvas;
}


// ========== 6. Buttons ==========
if (isValid(booking)) {

  // Save the ticket to the phone as a picture
  $("#dlImage").addEventListener("click", () => {
    drawTicket(booking).toBlob(blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Elite-Drive-ticket-${booking.ref}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  });

  // Print, or choose "Save as PDF" in the print window
  $("#printBtn").addEventListener("click", () => window.print());
}

}
