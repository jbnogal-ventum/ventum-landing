/* ----------------------------------------------------------------------------------------
* Ventum Software - Home page interactions
* Runs after function.js. Uses GSAP/ScrollTrigger when present and degrades gracefully.
* ---------------------------------------------------------------------------------------- */
(function () {
	"use strict";

	var root = document.documentElement;
	var hasGsap = typeof window.gsap !== "undefined";
	var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var hasIO = "IntersectionObserver" in window;

	if (hasST) {
		gsap.registerPlugin(ScrollTrigger);
	}

	function $all(sel, ctx) {
		return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
	}

	function onVisible(el, cb, options) {
		if (!el) return;
		if (!hasIO) { cb(true); return; }
		new IntersectionObserver(function (entries) {
			entries.forEach(function (e) { cb(e.isIntersecting, e); });
		}, options || { threshold: 0 }).observe(el);
	}

	/* Year */
	$all(".vt-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });

	/* ------------------------------------------------------------------
	   Hero title: split into words so they can rise in after the intro
	------------------------------------------------------------------ */
	function splitWords(el) {
		Array.prototype.slice.call(el.childNodes).forEach(function (node) {
			if (node.nodeType === 3) {
				var frag = document.createDocumentFragment();
				node.textContent.split(/(\s+)/).forEach(function (part) {
					if (!part) return;
					if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
					var outer = document.createElement("span");
					var inner = document.createElement("span");
					outer.className = "vt-word";
					inner.textContent = part;
					outer.appendChild(inner);
					frag.appendChild(outer);
				});
				node.parentNode.replaceChild(frag, node);
			} else if (node.nodeType === 1) {
				splitWords(node);
			}
		});
	}

	var heroTitle = document.querySelector(".vt-hero-title");
	var heroReveal = $all(".vt-hero-reveal");

	function playHero() {
		if (!hasGsap || reduceMotion || !heroTitle) return;
		gsap.fromTo(heroTitle.querySelectorAll(".vt-word > span"),
			{ yPercent: 110 },
			{ yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.035 });
		gsap.fromTo(heroReveal,
			{ autoAlpha: 0, y: 24 },
			{ autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.35 });
	}

	if (heroTitle && hasGsap && !reduceMotion) {
		splitWords(heroTitle);
		gsap.set(heroTitle.querySelectorAll(".vt-word > span"), { yPercent: 110 });
		gsap.set(heroReveal, { autoAlpha: 0 });
	}

	/* ------------------------------------------------------------------
	   Intro: the two wings of the V fly in, meet, and settle into the logo
	------------------------------------------------------------------ */
	function runIntro() {
		var overlay = document.querySelector(".vt-intro-overlay");
		var introOn = root.classList.contains("vt-intro");

		function finish() {
			root.classList.remove("vt-intro");
			if (overlay) overlay.remove();
			playHero();
		}

		if (!introOn || !overlay || !hasGsap) { finish(); return; }

		var seen = false;
		try { seen = sessionStorage.getItem("vtIntroSeen") === "1"; sessionStorage.setItem("vtIntroSeen", "1"); } catch (e) {}

		var logo = overlay.querySelector(".vt-intro-logo");
		var feathers = overlay.querySelectorAll(".vt-feather");
		var wordmark = overlay.querySelector(".vt-intro-wordmark");
		var target = document.querySelector(".main-header .vt-brand-logo");
		var speed = seen ? 0.55 : 1;

		var tl = gsap.timeline({ onComplete: finish, defaults: { ease: "expo.out" } });
		tl.timeScale(1 / speed);

		/* The feathers sweep in one by one to form the wing, it flaps once, then the name is revealed */
		tl.from(feathers, { xPercent: -90, yPercent: 35, rotation: -40, autoAlpha: 0, duration: 1, stagger: 0.14, transformOrigin: "100% 100%" }, 0.1)
		  .to(feathers, { rotation: -7, duration: 0.25, ease: "power2.out", stagger: 0.03, transformOrigin: "100% 100%" }, 1.05)
		  .to(feathers, { rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.5)", stagger: 0.03 }, 1.3)
		  .from(wordmark, { clipPath: "inset(0% 100% 0% 0%)", x: -20, duration: 1, ease: "expo.inOut" }, 1.1);

		tl.add(function () {
			if (!target || !logo) return;
			var from = logo.getBoundingClientRect();
			var to = target.getBoundingClientRect();
			var scale = to.width / from.width;
			var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
			var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
			gsap.to(logo, { x: dx, y: dy, scale: scale, duration: 0.9 * speed, ease: "expo.inOut" });
		}, 2.45);

		tl.to(overlay, { backgroundColor: "rgba(247, 248, 253, 0)", duration: 0.7, ease: "power2.inOut" }, 2.65)
		  .to({}, { duration: 0.2 });

		/* Let people skip it */
		overlay.addEventListener("click", function () { tl.progress(1); });
		document.addEventListener("keydown", function skip() {
			tl.progress(1);
			document.removeEventListener("keydown", skip);
		});
	}

	if (document.readyState === "complete") {
		runIntro();
	} else {
		window.addEventListener("load", runIntro);
	}

	/* ------------------------------------------------------------------
	   Hero background: slow "wind" lines that bend around the pointer
	------------------------------------------------------------------ */
	(function heroCanvas() {
		var canvas = document.querySelector(".vt-hero-canvas");
		if (!canvas || !canvas.getContext) return;
		var ctx = canvas.getContext("2d");
		var hero = canvas.parentNode;
		var w = 0, h = 0, dpr = 1, t = 0, running = false, raf = 0;
		var pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
		var lines = [];
		var COUNT = 16;

		for (var i = 0; i < COUNT; i++) {
			lines.push({
				base: (i + 1) / (COUNT + 1),
				amp: 10 + Math.random() * 22,
				freq: 0.0016 + Math.random() * 0.0018,
				speed: 0.15 + Math.random() * 0.25,
				phase: Math.random() * Math.PI * 2,
				accent: i === 5 ? "rgba(0, 98, 221, 0.28)" : i === 11 ? "rgba(18, 131, 255, 0.35)" : null
			});
		}

		function resize() {
			var r = hero.getBoundingClientRect();
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			draw();
		}

		function draw() {
			ctx.clearRect(0, 0, w, h);
			pointer.x += (pointer.tx - pointer.x) * 0.08;
			pointer.y += (pointer.ty - pointer.y) * 0.08;
			var step = w < 700 ? 18 : 12;

			lines.forEach(function (l) {
				var by = l.base * h;
				ctx.beginPath();
				for (var x = -step; x <= w + step; x += step) {
					var y = by
						+ Math.sin(x * l.freq + t * l.speed + l.phase) * l.amp
						+ Math.sin(x * l.freq * 2.3 - t * l.speed * 0.6) * (l.amp * 0.35);
					var dx = x - pointer.x, dy = y - pointer.y;
					var d2 = dx * dx + dy * dy;
					y += (dy >= 0 ? 1 : -1) * 36 * Math.exp(-d2 / 18000);
					if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
				}
				ctx.lineWidth = l.accent ? 1.5 : 1;
				ctx.strokeStyle = l.accent || "rgba(21, 22, 27, 0.07)";
				ctx.stroke();
			});
		}

		function loop() {
			if (!running) return;
			t += 0.016;
			draw();
			raf = requestAnimationFrame(loop);
		}

		function setRunning(on) {
			if (reduceMotion) return;
			if (on && !running) { running = true; raf = requestAnimationFrame(loop); }
			if (!on && running) { running = false; cancelAnimationFrame(raf); }
		}

		hero.addEventListener("pointermove", function (e) {
			var r = hero.getBoundingClientRect();
			pointer.tx = e.clientX - r.left;
			pointer.ty = e.clientY - r.top;
		});
		hero.addEventListener("pointerleave", function () { pointer.tx = -9999; pointer.ty = -9999; });

		window.addEventListener("resize", resize);
		resize();
		onVisible(hero, setRunning);
		document.addEventListener("visibilitychange", function () {
			setRunning(!document.hidden);
		});
	})();

	/* ------------------------------------------------------------------
	   Clients marquee: seamless loop, pause on hover, tap to reveal
	------------------------------------------------------------------ */
	(function clients() {
		var marquee = document.querySelector(".vt-marquee");
		if (!marquee) return;
		var track = marquee.querySelector(".vt-marquee-track");
		var clone = track.cloneNode(true);
		clone.setAttribute("aria-hidden", "true");
		$all(".vt-client", clone).forEach(function (c) { c.setAttribute("tabindex", "-1"); });
		marquee.appendChild(clone);

		function setSpeed() {
			var dur = Math.max(track.scrollWidth / 55, 20) + "s";
			track.style.animationDuration = dur;
			clone.style.animationDuration = dur;
		}
		setSpeed();
		window.addEventListener("resize", setSpeed);

		var cards = $all(".vt-client", marquee);
		function clear() {
			cards.forEach(function (c) { c.classList.remove("is-active"); });
			marquee.classList.remove("is-paused");
		}

		marquee.addEventListener("click", function (e) {
			var card = e.target.closest(".vt-client");
			if (!card) return;
			var wasActive = card.classList.contains("is-active");
			clear();
			if (!wasActive) {
				card.classList.add("is-active");
				marquee.classList.add("is-paused");
			}
		});

		marquee.addEventListener("keydown", function (e) {
			if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("vt-client")) {
				e.preventDefault();
				e.target.click();
			}
		});

		document.addEventListener("click", function (e) {
			if (!marquee.contains(e.target)) clear();
		});
	})();

	/* ------------------------------------------------------------------
	   Problems: highlight the item crossing the middle of the viewport
	------------------------------------------------------------------ */
	(function problems() {
		var items = $all(".vt-problem");
		if (!items.length) return;
		if (!hasIO || reduceMotion) { root.classList.add("vt-no-observer"); return; }
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) {
					items.forEach(function (i) { i.classList.toggle("is-active", i === e.target); });
				}
			});
		}, { rootMargin: "-45% 0px -45% 0px" });
		items.forEach(function (i) { io.observe(i); });
	})();

	/* Education visual: animate bars once in view */
	(function eduVisual() {
		var el = document.querySelector(".vt-edu-visual");
		var done = false;
		onVisible(el, function (visible) {
			if (visible && !done) { done = true; el.classList.add("is-inview"); }
		}, { threshold: 0.35 });
	})();

	/* ------------------------------------------------------------------
	   Scroll-driven progress for the AI thread and the methodology line
	------------------------------------------------------------------ */
	function progressLine(opts) {
		var container = document.querySelector(opts.container);
		if (!container) return;
		var markers = $all(opts.markers, container);
		var track = container.querySelector(opts.track);
		var fractions = [];

		function measure() {
			var tr = track.getBoundingClientRect();
			var vertical = tr.height > tr.width;
			fractions = markers.map(function (m) {
				var r = m.getBoundingClientRect();
				var f = vertical
					? (opts.fromBottom ? (tr.bottom - (r.top + r.height / 2)) : ((r.top + r.height / 2) - tr.top)) / tr.height
					: ((r.left + r.width / 2) - tr.left) / tr.width;
				return Math.min(Math.max(f, 0), 1);
			});
		}

		function update(p) {
			container.style.setProperty("--progress", p.toFixed(4));
			markers.forEach(function (m, i) {
				var target = opts.activeTarget ? m.closest(opts.activeTarget) : m;
				target.classList.toggle(opts.activeClass, p + 0.001 >= fractions[i]);
			});
		}

		measure();

		if (!hasST || reduceMotion) {
			update(1);
			return;
		}

		ScrollTrigger.create({
			trigger: container,
			start: opts.start,
			end: opts.end,
			scrub: 0.6,
			onRefresh: function (self) { measure(); update(self.progress); },
			onUpdate: function (self) { update(self.progress); }
		});
		update(0);
	}

	progressLine({
		container: ".vt-stack",
		track: ".vt-stack-thread",
		markers: ".vt-node",
		activeTarget: ".vt-layer",
		activeClass: "is-lit",
		fromBottom: true,
		start: "top 80%",
		end: "bottom 40%"
	});

	progressLine({
		container: ".vt-steps",
		track: ".vt-steps-track",
		markers: ".vt-step-dot",
		activeTarget: ".vt-step",
		activeClass: "is-active",
		start: "top 75%",
		end: "bottom 60%"
	});

	/* ------------------------------------------------------------------
	   Why Ventum: a small live board where tickets move toward "Done"
	------------------------------------------------------------------ */
	(function board() {
		var boardEl = document.querySelector(".vt-board");
		if (!boardEl) return;
		var cols = $all(".vt-col", boardEl);
		var tickets = $all(".vt-ticket", boardEl);
		var home = tickets.map(function (t) { return t.parentNode; });
		var bar = boardEl.querySelector(".vt-board-progress span");
		var pct = boardEl.querySelector(".vt-board-pct");
		var last = cols.length - 1;
		var timer = 0, visible = false;

		function render() {
			var done = cols[last].querySelectorAll(".vt-ticket").length;
			var value = Math.round(done / tickets.length * 100);
			bar.style.width = value + "%";
			pct.textContent = value + "%";
		}

		function moveTicket(ticket, col) {
			var before = ticket.getBoundingClientRect();
			col.appendChild(ticket);
			if (!hasGsap) return;
			var after = ticket.getBoundingClientRect();
			ticket.classList.add("is-moving");
			gsap.fromTo(ticket,
				{ x: before.left - after.left, y: before.top - after.top },
				{ x: 0, y: 0, duration: 0.8, ease: "expo.inOut", onComplete: function () { ticket.classList.remove("is-moving"); } });
		}

		function step() {
			for (var c = last - 1; c >= 0; c--) {
				var t = cols[c].querySelector(".vt-ticket");
				if (t) { moveTicket(t, cols[c + 1]); render(); return; }
			}
			/* Everything is done: reset the sprint */
			var fade = function (v, cb) {
				if (hasGsap) gsap.to(cols, { autoAlpha: v, duration: 0.4, onComplete: cb });
				else if (cb) cb();
			};
			fade(0, function () {
				tickets.forEach(function (t, i) { home[i].appendChild(t); });
				render();
				fade(1);
			});
		}

		function schedule() {
			clearTimeout(timer);
			if (!visible || document.hidden) return;
			var done = cols[last].querySelectorAll(".vt-ticket").length === tickets.length;
			timer = setTimeout(function () { step(); schedule(); }, done ? 2600 : 1700);
		}

		render();
		if (reduceMotion) return;
		onVisible(boardEl, function (v) { visible = v; schedule(); }, { threshold: 0.3 });
		document.addEventListener("visibilitychange", schedule);
	})();

	/* ------------------------------------------------------------------
	   Contact form
	------------------------------------------------------------------ */
	(function contactForm() {
		var form = document.getElementById("vtContactForm");
		if (!form) return;
		var status = document.getElementById("vtFormStatus");
		var button = form.querySelector("button[type=submit]");
		var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

		function groupOf(el) {
			return el.closest(".form-group");
		}

		function validateField(el) {
			var ok = true;
			if (el.type === "radio") {
				ok = !!form.querySelector("input[name='" + el.name + "']:checked");
			} else if (el.required) {
				ok = el.value.trim() !== "";
				if (ok && el.type === "email") ok = emailRe.test(el.value.trim());
			}
			groupOf(el).classList.toggle("is-invalid", !ok);
			return ok;
		}

		function fields() {
			var seen = {};
			return $all("input[required], textarea[required], input[type=radio]", form).filter(function (el) {
				if (el.type !== "radio") return true;
				if (seen[el.name]) return false;
				seen[el.name] = true;
				return true;
			});
		}

		form.addEventListener("input", function (e) {
			if (groupOf(e.target) && groupOf(e.target).classList.contains("is-invalid")) validateField(e.target);
		});
		form.addEventListener("change", function (e) {
			if (e.target.type === "radio") validateField(e.target);
		});

		function setStatus(msg, ok) {
			status.textContent = msg;
			status.className = "vt-form-status " + (ok ? "is-success" : "is-error");
		}

		form.addEventListener("submit", function (e) {
			e.preventDefault();
			var invalid = fields().filter(function (el) { return !validateField(el); });
			if (invalid.length) {
				invalid[0].focus();
				setStatus("", true);
				return;
			}

			button.disabled = true;
			setStatus("Sending…", true);

			fetch(form.getAttribute("action"), {
				method: "POST",
				body: new FormData(form),
				headers: { "Accept": "application/json" }
			})
				.then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
				.then(function (data) {
					if (data && data.ok) {
						form.reset();
						setStatus("Thank you — we've received your message and will be in touch soon.", true);
					} else {
						setStatus((data && data.message) || "Something went wrong. Please email us at info@ventum.dev.", false);
					}
				})
				.catch(function () {
					setStatus("We couldn't send your message. Please email us at info@ventum.dev.", false);
				})
				.then(function () { button.disabled = false; });
		});
	})();
})();
