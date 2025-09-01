// ==========================
// UTIL: SELECTORS
// ==========================
const $ = (q,el=document)=>el.querySelector(q);
const $$ = (q,el=document)=>[...el.querySelectorAll(q)];

// ==========================
// THEME TOGGLE
// ==========================
const themeBtn = $('#themeBtn');
const storedTheme = localStorage.getItem('theme');
if(storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);
themeBtn.addEventListener('click', ()=>{
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  fancyToast(`Tema: ${next}`);
});

// ==========================
// TYPING EFFECT (hero subtitle)
// ==========================
const typingEl = $('#typing');
const roles = [
  'Pelajar yang suka belajar hal baru',
  'Desainer & Fotografer',
  'Front-End Enthusiast',
  'Siap kolaborasi untuk project seru'
];
let i=0, j=0, erasing=false;
function typeLoop(){
  const word = roles[i % roles.length];
  typingEl.textContent = word.slice(0, j);
  if(!erasing){ j++; if(j>word.length+10){ erasing=true; }}
  else { j--; if(j===0){ erasing=false; i++; }}
  setTimeout(typeLoop, erasing? 28 : 48);
}
typeLoop();

// ==========================
// ON-SCROLL REVEAL & STAGGER
// ==========================
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); } });
},{ threshold:.12 });
$$('.reveal, .stagger').forEach(el=> io.observe(el));

// ==========================
// PROGRESS BAR
// ==========================
const progress = $('#progress');
function updateProgress(){
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const pct = (scrollTop/height)*100; progress.style.width = pct + '%';
}
document.addEventListener('scroll', updateProgress, { passive:true }); updateProgress();

// ==========================
// CURSOR BLOB + MAGNETIC BUTTON
// ==========================
const cursor = $('#cursor');
window.addEventListener('mousemove', (e)=>{
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});
$$('.btn').forEach(btn=>{
  btn.addEventListener('mousemove', (e)=>{
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width/2;
    const y = e.clientY - r.top - r.height/2;
    btn.style.transform = `translate(${x*.05}px, ${y*.05}px)`;
    cursor.classList.add('small');
  });
  btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; cursor.classList.remove('small'); });
});

// ==========================
// FANCY TOAST
// ==========================
let toastTimeout;
function fancyToast(text){
  clearTimeout(toastTimeout);
  let t = $('#toast');
  if(!t){
    t = document.createElement('div'); t.id='toast';
    t.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);padding:10px 14px;border-radius:999px;border:1px solid var(--border);background:linear-gradient(180deg,var(--card),transparent);box-shadow:var(--shadow);z-index:80;backdrop-filter: blur(6px);';
    document.body.appendChild(t);
  }
  t.innerHTML = '✨ ' + text; t.style.opacity='1';
  toastTimeout = setTimeout(()=> t.style.opacity='0', 1600);
}

// ==========================
// AUTO-BIND NAME TO BRAND/FOOTER
// ==========================
const nameEl = $('#nama');
const brandName = $('#brandName');
const footerName = $('#footerName');
nameEl.addEventListener('input', ()=>{ brandName.textContent = nameEl.textContent; footerName.textContent = nameEl.textContent; });

// ==========================
// YEAR
// ==========================
$('#year').textContent = new Date().getFullYear();
