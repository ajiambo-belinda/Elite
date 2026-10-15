

// Towns across Kenya 
const towns = [
  { name: "Nairobi",   lat: -1.286, lng: 36.817 },
  { name: "Mombasa",   lat: -4.043, lng: 39.668 },
  { name: "Kisumu",    lat: -0.091, lng: 34.768 },
  { name: "Nakuru",    lat: -0.303, lng: 36.080 },
  { name: "Eldoret",   lat:  0.514, lng: 35.270 },
  { name: "Kakamega",  lat:  0.283, lng: 34.752 },
  { name: "Bungoma",   lat:  0.569, lng: 34.560 },
  { name: "Busia",     lat:  0.460, lng: 34.111 },
  { name: "Webuye",    lat:  0.607, lng: 34.770 },
  { name: "Mumias",    lat:  0.335, lng: 34.488 },
  { name: "Kitale",    lat:  1.015, lng: 35.006 },
  { name: "Kisii",     lat: -0.682, lng: 34.767 },
  { name: "Migori",    lat: -1.063, lng: 34.473 },
  { name: "Homa Bay",  lat: -0.527, lng: 34.457 },
  { name: "Siaya",     lat:  0.061, lng: 34.288 },
  { name: "Kericho",   lat: -0.368, lng: 35.283 },
  { name: "Narok",     lat: -1.078, lng: 35.860 },
  { name: "Naivasha",  lat: -0.717, lng: 36.431 },
  { name: "Nyahururu", lat:  0.037, lng: 36.363 },
  { name: "Nyeri",     lat: -0.420, lng: 36.951 },
  { name: "Nanyuki",   lat:  0.007, lng: 37.073 },
  { name: "Meru",      lat:  0.047, lng: 37.649 },
  { name: "Embu",      lat: -0.531, lng: 37.451 },
  { name: "Thika",     lat: -1.033, lng: 37.069 },
  { name: "Machakos",  lat: -1.517, lng: 37.263 },
  { name: "Kitui",     lat: -1.367, lng: 38.011 },
  { name: "Voi",       lat: -3.396, lng: 38.556 },
  { name: "Malindi",   lat: -3.217, lng: 40.117 },
  { name: "Garissa",   lat: -0.453, lng: 39.646 },
  { name: "Lodwar",    lat:  3.119, lng: 35.597 }
].sort((a, b) => a.name.localeCompare(b.name));   

const RATE_PER_KM = 4.5;   
const MIN_FARE    = 300;   
const AVG_SPEED   = 70;    

// Each vehicle has a seat layout.
// "D" = driver, null = empty space, numbers = passenger seats.
const vehicles = [
  { id: 1, name: "Toyota Axio",     type: "Sedan", img: "images/Toyota Noah.jpg", 
    layout: [["D", null, "1"], ["2", "3", "4"]] },
  { id: 2, name: "Subaru Forester", type: "SUV",   img: "images/Toyota Voxy.jpg",
    layout: [["D", null, "1"], ["2", "3", "4"]] },
  
];

// Times the rides leave each day, from any town
const departures = ["08:00", "10:00", "20:00", "21:00", "22:00"];

// The passenger seats of a vehicle
const seatList = v => v.layout.flat().filter(cell => cell && cell !== "D");


// ========== 2. Helpers ==========
const $   = s => document.querySelector(s);
const kes = n => "KES " + n.toLocaleString();
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}


function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

// Today's date as YYYY-MM-DD
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);


//  Saved bookings 
let bookings = [];
try { bookings = JSON.parse(localStorage.getItem("eliteDriveBookings")) || []; } catch (e) { bookings = []; }

function saveBookings() {
  try { localStorage.setItem("eliteDriveBookings", JSON.stringify(bookings)); } catch (e) {}
}


//  Routes, rides and seats
const townByName = name => towns.find(t => t.name === name);

function distanceKm(a, b) {                       
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.25;  
}

function findRoute(from, to) {
  const a = townByName(from), b = townByName(to);
  if (!a || !b || a === b) return null;
  const km = Math.round(distanceKm(a, b));
  return {
    from, to, km,
    price:   Math.max(MIN_FARE, Math.round(km * RATE_PER_KM / 50) * 50),   
    minutes: Math.round(km / AVG_SPEED * 60)
  };
}


// so the seat map doesn't look empty. The same ride always gets the same result.
function demoTaken(tripId, total) {
  let h = 0;
  for (const ch of tripId) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const taken = [];
  for (let n = 1; n <= total; n++) if ((h + n * 3) % 7 < 2) taken.push(String(n));
  return taken;
}

// All taken seats on a ride: the demo ones plus real bookings made here
function takenSeats(tripId, total) {
  const real = bookings.filter(b => b.tripId === tripId).flatMap(b => b.seats);
  return [...new Set([...demoTaken(tripId, total), ...real])];
}

// Build the day's rides for a route
function buildTrips(from, to, date) {
  const route = findRoute(from, to);
  if (!route) return [];
  const now = new Date().toTimeString().slice(0, 5);          

  return departures
    .map((time, i) => {
      const vehicle = vehicles[i % vehicles.length];          
      const total = seatList(vehicle).length;
      const id = `${from}-${to}-${date}-${time}`;             
      const taken = takenSeats(id, total);
      return { id, from, to, date, time, vehicle, price: route.price, taken, left: total - taken.length };
    })
    .filter(t => !(date === today && t.time <= now));        
}


//  Mobile menu 
const menuBtn  = $("#menuBtn");
const navLinks = $("#navLinks");

menuBtn.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
navLinks.addEventListener("click", e => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});


//  Showing one screen at a time 
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.hidden = true);
  if (id) {
    const el = $("#" + id);
    el.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
document.querySelectorAll(".back").forEach(b =>
  b.addEventListener("click", () => showScreen(b.dataset.back))
);


//  Search form 
const fromSel = $("#from"), toSel = $("#to"), dateInp = $("#date"), paxSel = $("#pax");

towns.forEach(t => {
  fromSel.add(new Option(t.name, t.name));   
  toSel.add(new Option(t.name, t.name));
});
fromSel.value = "Nairobi";
toSel.value   = "Kakamega";
dateInp.min   = today;
dateInp.value = today;

let search = null;        
let currentTrips = [];    

$("#searchForm").addEventListener("submit", e => {
  e.preventDefault();                                          
  const err = $("#searchErr");
  const from = fromSel.value, to = toSel.value, date = dateInp.value;

  if (from === to)           { err.textContent = "Choose different towns for From and To."; return; }
  if (!date || date < today) { err.textContent = "Choose today's date or a later date.";    return; }
  if (!findRoute(from, to))  { err.textContent = "Please choose two different towns.";      return; }

  err.textContent = "";
  search = { from, to, date, pax: Number(paxSel.value) };
  renderTrips();
  showScreen("screenTrips");
});


//  Ride cards 
function renderTrips() {
  const { from, to, date, pax } = search;
  currentTrips = buildTrips(from, to, date).filter(t => t.left >= pax);   // only rides with enough seats

  $("#tripsTitle").textContent = `${from} to ${to} · ${formatDate(date)}`;
  $("#tripList").innerHTML = currentTrips.length ? currentTrips.map(t => `
    <article class="trip">
      <div class="trip-img"><img src="${t.vehicle.img}" alt="${esc(t.vehicle.name)}" loading="lazy"
           onerror="this.replaceWith(document.createTextNode('${t.vehicle.icon}'))"></div>
      <div class="time">${formatTime(t.time)}</div>
      <h3>${t.from} → ${t.to}</h3>
      <div class="meta"><span class="badge">${t.vehicle.type}</span> ${esc(t.vehicle.name)}</div>
      <div class="${t.left <= 2 ? "low" : "meta"}">${t.left} seat${t.left === 1 ? "" : "s"} left</div>
      <div class="price">${kes(t.price)} <span class="meta">per seat</span></div>
      <div class="meta">${pax} passenger${pax > 1 ? "s" : ""}: ${kes(t.price * pax)}</div>
      <button data-trip="${t.id}">Select seats</button>
    </article>`).join("")
    : '<p class="empty">No rides with enough seats. Try another date or fewer passengers.</p>';
}

// One listener for all the "Select seats" buttons (event delegation)
$("#tripList").addEventListener("click", e => {
  const btn = e.target.closest("button[data-trip]");
  if (btn) chooseTrip(btn.dataset.trip);
});

// Temporary: the next step replaces this with the real seat map
function chooseTrip(id) {
  console.log("Chosen ride:", id);
}