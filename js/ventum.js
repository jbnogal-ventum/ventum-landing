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

	/* Menu parents without a destination only open their dropdown; don't jump to the top */
	$all(".main-menu .submenu > a[href='#']").forEach(function (a) {
		a.addEventListener("click", function (e) { e.preventDefault(); });
	});

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

		/* Lock the board at its tallest state (every ticket in one column) so moving
		   tickets never changes its height and pushes the content below it around */
		var colsEl = boardEl.querySelector(".vt-board-cols");
		function lockHeight() {
			var current = cols.map(function (c) { return $all(".vt-ticket", c); });
			colsEl.style.minHeight = "";
			tickets.forEach(function (t) { cols[last].appendChild(t); });
			var h = colsEl.offsetHeight;
			current.forEach(function (list, i) { list.forEach(function (t) { cols[i].appendChild(t); }); });
			colsEl.style.minHeight = h + "px";
		}
		lockHeight();
		window.addEventListener("resize", lockHeight);
		window.addEventListener("load", lockHeight);
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeight);

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

	/* ------------------------------------------------------------------
	   Calendly: open booking links in Calendly's popup instead of a new tab.
	   The widget is only loaded on the first click; if it can't load
	   (offline, blocked), the link opens in a new tab as a fallback.
	------------------------------------------------------------------ */
	(function calendly() {
		var links = $all("a[href^='https://calendly.com/']");
		if (!links.length) return;

		var WIDGET = "https://assets.calendly.com/assets/external/widget";
		var loading = null;

		function loadWidget() {
			if (window.Calendly) return Promise.resolve();
			if (loading) return loading;

			var css = document.createElement("link");
			css.rel = "stylesheet";
			css.href = WIDGET + ".css";
			document.head.appendChild(css);

			loading = new Promise(function (resolve, reject) {
				var js = document.createElement("script");
				js.src = WIDGET + ".js";
				js.async = true;
				js.onload = function () { window.Calendly ? resolve() : reject(); };
				js.onerror = function () { loading = null; reject(); };
				document.head.appendChild(js);
			});
			return loading;
		}

		links.forEach(function (link) {
			link.setAttribute("aria-haspopup", "dialog");

			/* Start loading as soon as someone shows intent, so the popup opens faster */
			link.addEventListener("pointerenter", function () { loadWidget().catch(function () {}); }, { once: true });
			link.addEventListener("focus", function () { loadWidget().catch(function () {}); }, { once: true });

			link.addEventListener("click", function (e) {
				if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
				e.preventDefault();
				var url = link.href;
				loadWidget()
					.then(function () { window.Calendly.initPopupWidget({ url: url }); })
					.catch(function () {
						var win = window.open(url, "_blank");
						if (win) win.opener = null;
						else window.location.href = url;
					});
			});
		});
	})();
})();
