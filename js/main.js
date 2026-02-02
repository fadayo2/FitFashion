
    // 1. Carousel Logic
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.dot');

function showSlide(index) {
    slides.forEach((s, i) => {
        s.classList.toggle('opacity-100', i === index);
        s.classList.toggle('opacity-0', i !== index);
    });
    dots.forEach((d, i) => {
        d.classList.toggle('bg-yellow-600', i === index);
        d.classList.toggle('bg-zinc-800', i !== index);
    });
}

setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}, 5000);

// 2. See More Logic
async function revealMore() {
    const btn = document.getElementById('seeMoreBtn');
    const loader = document.getElementById('loader');
    
    btn.classList.add('opacity-0', 'pointer-events-none');
    loader.classList.remove('hidden');

    // Simulate fetching more items from Supabase
    setTimeout(async () => {
        // Here you would typically fetch the NEXT page of items from Supabase
        // For now, we'll just show that it's "loading"
        loader.classList.add('hidden');
        
        // Example: loadProducts(nextPageOffset);
        
        // Optional: If no more products, change text
        btn.innerHTML = '<span class="text-[10px] uppercase tracking-[0.5em] text-zinc-600">End of Collection</span>';
        btn.classList.remove('opacity-0');
    }, 1500);
}

    // Function to update the cart badge count
function updateNavCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const badge = document.getElementById("cartCount");
    
    const totalItems = cart.length;
    
    if (totalItems > 0) {
        badge.innerText = totalItems;
        badge.classList.remove("opacity-0");
        badge.classList.add("opacity-100");
    } else {
        badge.classList.add("opacity-0");
    }
}

// Update the addToCart function you already have to call this:
window.addToCart = (id, name, price) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.push({ id, name, price, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Refresh the nav count immediately
    updateNavCartCount();
    
    // Show your toast notification logic here...
};

// Call on page load
document.addEventListener('DOMContentLoaded', updateNavCartCount);

    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.1;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.3 + 0.1;
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }
    for (let i = 0; i < 60; i++) particles.push(new Particle());
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();