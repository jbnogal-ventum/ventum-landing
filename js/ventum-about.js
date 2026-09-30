/* ----------------------------------------------------------------------------------------
* Ventum Software - About page interactions
* Runs after ventum.js (which handles the hero title, year and menu). Degrades gracefully:
* without Swiper the first team photo simply stays in place.
* ---------------------------------------------------------------------------------------- */
(function () {
	"use strict";

	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* ------------------------------------------------------------------
	   Team gallery: photos cross-fade in an endless loop
	------------------------------------------------------------------ */
	(function teamGallery() {
		var gallery = document.querySelector(".vt-ab-gallery");
		if (!gallery || typeof window.Swiper === "undefined") return;

		new Swiper(gallery.querySelector(".swiper"), {
			loop: true,
			effect: "fade",
			fadeEffect: { crossFade: true },
			speed: 900,
			grabCursor: true,
			autoplay: reduceMotion ? false : {
				delay: 3500,
				disableOnInteraction: false,
				pauseOnMouseEnter: true
			},
			pagination: {
				el: gallery.querySelector(".vt-ab-gallery-dots"),
				clickable: true
			},
			a11y: { enabled: true }
		});
	})();

	/* ------------------------------------------------------------------
	   Our story: four isometric blocks grow one after another, then the
	   Ventum logo floats in above the tallest. Blocks are drawn from their
	   height, so they genuinely rise (no stretching). Plays once in view.
	------------------------------------------------------------------ */
	(function growth() {
		var host = document.querySelector(".vt-ab-growth");
		if (!host) return;

		var NS = "http://www.w3.org/2000/svg";
		var COS = 0.866, SIN = 0.5;       // isometric axes (30deg)
		var OX = 150, OY = 682;           // ground origin inside the 600x800 viewBox
		var SIZE = 90, STEP = 116;        // block footprint and spacing along the diagonal
		var INSET = 12;                   // inner line on each top face
		var INK = "#16233F";              // navy outline

		var BLOCKS = [
			{ h: 90,  top: "#FFFFFF", left: "#F4F6FA", right: "#E8ECF3", inner: "rgba(22, 35, 63, 0.12)" },
			{ h: 150, top: "#FFFFFF", left: "#EEF2F8", right: "#DFE5EE", inner: "rgba(22, 35, 63, 0.12)" },
			{ h: 215, top: "#EEF5FE", left: "#D5E6FC", right: "#BCD6F9", inner: "rgba(0, 98, 221, 0.3)" },
			{ h: 290, top: "#2A8BFF", left: "#0062DD", right: "#0050B8", inner: "rgba(255, 255, 255, 0.45)" }
		];

		/* Logo: 279x457 asset, centred over the tallest block's top face with clear air between */
		var LOGO = { w: 92, h: 150, x: 405, y: 28 };
		var LOGO_SHADOW = { cx: 451, cy: 263 };

		var RADIUS = 9;                   // rounded block corners (screen units), like the site's illustrations
		var INSET_RADIUS = 5;

		/* Isometric point -> screen [x, y] */
		function pt(x, y, z) {
			return [OX + (x - y) * COS, OY + (x + y) * SIN - z];
		}

		function fmt(p) {
			return p[0].toFixed(1) + "," + p[1].toFixed(1);
		}

		function dist(a, b) {
			return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
		}

		/* Point at distance r from `from` towards `to` */
		function toward(from, to, r) {
			var d = dist(from, to);
			if (d < 0.01) return from;
			return [from[0] + (to[0] - from[0]) * r / d, from[1] + (to[1] - from[1]) * r / d];
		}

		/* Corner radius that fits between two edges (short edges while a block is still low) */
		function cornerRadius(prev, cur, next, r) {
			return Math.min(r, dist(prev, cur) / 2, dist(cur, next) / 2);
		}

		/* Closed path through the points with every corner rounded */
		function roundedPath(points, r) {
			var p = points.filter(function (q, i) {
				return dist(q, points[(i + points.length - 1) % points.length]) > 0.01;
			});
			if (p.length < 3) return "";
			var d = "";
			for (var i = 0; i < p.length; i++) {
				var prev = p[(i + p.length - 1) % p.length], cur = p[i], next = p[(i + 1) % p.length];
				var cr = cornerRadius(prev, cur, next, r);
				d += (i ? "L" : "M") + fmt(toward(cur, prev, cr)) + "Q" + fmt(cur) + " " + fmt(toward(cur, next, cr));
			}
			return d + "Z";
		}

		function el(tag, attrs, parent) {
			var node = document.createElementNS(NS, tag);
			for (var k in attrs) node.setAttribute(k, attrs[k]);
			if (parent) parent.appendChild(node);
			return node;
		}

		var svg = el("svg", { viewBox: "0 0 600 800", "aria-hidden": "true", focusable: "false" }, host);
		var defs = el("defs", {}, svg);
		el("feGaussianBlur", { stdDeviation: "9" }, el("filter", { id: "vtAbSoft", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs));
		el("feDropShadow", { dx: "0", dy: "14", stdDeviation: "12", "flood-color": "#0062DD", "flood-opacity": "0.28" },
			el("filter", { id: "vtAbLogo", x: "-60%", y: "-40%", width: "220%", height: "200%" }, defs));

		/* Each block is its own group: ground shadow, the three faces (clipped to the rounded
		   silhouette so the corners are soft), the rounded outline, the inner edges on top,
		   and a rounded inner line on the top face */
		var blocks = BLOCKS.map(function (b, i) {
			var y0 = -STEP * i, s = SIZE;
			var g = el("g", { "class": "vt-ab-block" });
			var shadow = el("path", {
				d: roundedPath([pt(0, y0, 0), pt(s, y0, 0), pt(s, y0 + s, 0), pt(0, y0 + s, 0)], RADIUS),
				transform: "translate(14 6)", fill: "rgba(22, 35, 63, 0.1)", filter: "url(#vtAbSoft)"
			}, g);

			var clipId = "vtAbClip" + i;
			var clip = el("path", {}, el("clipPath", { id: clipId }, defs));
			var faces = el("g", { "clip-path": "url(#" + clipId + ")" }, g);
			var left = el("polygon", { fill: b.left }, faces);
			var right = el("polygon", { fill: b.right }, faces);
			var top = el("polygon", { fill: b.top }, faces);

			var line = { fill: "none", stroke: INK, "stroke-width": "2.5", "stroke-linejoin": "round", "stroke-linecap": "round" };
			var outline = el("path", line, g);
			var edges = el("path", line, g);
			var inner = el("path", { fill: "none", stroke: b.inner, "stroke-width": "1.2" }, g);

			var block = { g: g, shadow: shadow, h: b.h };
			block.draw = function (h) {
				var n = INSET;
				/* Corners: T* on the top face (T3 is the front one), A/B/C along the ground */
				var T1 = pt(0, y0, h), T2 = pt(s, y0, h), T3 = pt(s, y0 + s, h), T4 = pt(0, y0 + s, h);
				var A = pt(0, y0 + s, 0), B = pt(s, y0 + s, 0), C = pt(s, y0, 0);
				var silhouette = roundedPath([T1, T2, C, B, A, T4], RADIUS);

				left.setAttribute("points", [A, B, T3, T4].map(fmt).join(" "));
				right.setAttribute("points", [B, C, T2, T3].map(fmt).join(" "));
				top.setAttribute("points", [T1, T2, T3, T4].map(fmt).join(" "));
				clip.setAttribute("d", silhouette);
				outline.setAttribute("d", silhouette);

				/* Inner edges meet the outline where its rounded curve passes (a quarter radius
				   from the corner, since each inner edge bisects its corner) */
				var eT2 = toward(T2, T3, cornerRadius(T1, T2, C, RADIUS) / 4);
				var eT4 = toward(T4, T3, cornerRadius(A, T4, T1, RADIUS) / 4);
				var eB = toward(B, T3, cornerRadius(C, B, A, RADIUS) / 4);
				edges.setAttribute("d", "M" + fmt(eT2) + "L" + fmt(T3) + "L" + fmt(eT4) + "M" + fmt(T3) + "L" + fmt(eB));

				inner.setAttribute("d", roundedPath([pt(n, y0 + n, h), pt(s - n, y0 + n, h), pt(s - n, y0 + s - n, h), pt(n, y0 + s - n, h)], INSET_RADIUS));
			};
			return block;
		});

		/* Paint back to front: the tallest block sits furthest back */
		for (var i = blocks.length - 1; i >= 0; i--) svg.appendChild(blocks[i].g);

		var logoShadow = el("ellipse", {
			cx: LOGO_SHADOW.cx, cy: LOGO_SHADOW.cy, rx: 30, ry: 13,
			fill: "rgba(0, 30, 90, 0.35)", filter: "url(#vtAbSoft)"
		}, svg);
		var logo = el("image", {
			href: host.getAttribute("data-logo"),
			x: LOGO.x, y: LOGO.y, width: LOGO.w, height: LOGO.h,
			filter: "url(#vtAbLogo)"
		}, svg);

		var hasGsap = typeof window.gsap !== "undefined";

		/* Reduced motion or no GSAP: show the finished illustration */
		if (!hasGsap || reduceMotion) {
			blocks.forEach(function (b) { b.draw(b.h); });
			return;
		}

		/* Starting state: first cube fully built but hidden; the others flat and hidden */
		var heights = blocks.map(function () { return { h: 0 }; });
		blocks[0].draw(blocks[0].h);
		for (var j = 1; j < blocks.length; j++) blocks[j].draw(0);
		gsap.set(blocks.map(function (b) { return b.g; }), { autoAlpha: 0 });
		gsap.set(blocks[0].g, { y: 24 });
		gsap.set(logo, { autoAlpha: 0, y: 26, scale: 0.94, transformOrigin: "50% 100%" });
		gsap.set(logoShadow, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });

		/* Loops: build up, hold, take it down, start again. Each cycle is started with restart()
		   rather than repeat: -1, which rewinds every tween cleanly (with repeat, the first
		   cube's fade-in at time 0 wasn't re-applied and it stayed hidden from the 2nd cycle).
		   A cycle that ends off screen waits until the illustration is back in view. */
		var inView = false, waiting = false;
		function nextCycle() {
			if (inView) tl.restart();
			else waiting = true;
		}

		var tl = gsap.timeline({
			paused: true,
			defaults: { ease: "power3.out" },
			onComplete: function () { gsap.delayedCall(0.5, nextCycle); }
		});

		/* 1. The beginning: the smallest cube settles in */
		tl.to(blocks[0].g, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" });

		/* 2-4. Each block rises from the ground to its height, a little slower as they grow */
		[1, 2, 3].forEach(function (k) {
			var block = blocks[k];
			tl.to(block.g, { autoAlpha: 1, duration: 0.25, ease: "none" }, "+=0.15");
			tl.to(heights[k], {
				h: block.h,
				duration: k === 3 ? 0.9 : 0.75,
				onUpdate: function () { block.draw(heights[k].h); }
			}, "<");
		});

		/* 5. Ventum appears above the tallest block */
		tl.to(logo, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power2.out" }, "+=0.2");
		tl.to(logoShadow, { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power2.out" }, "<");

		/* Hold the finished illustration: the logo floats once (the shadow breathes with it) */
		tl.to(logo, { y: -7, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 });
		tl.to(logoShadow, { scale: 0.85, autoAlpha: 0.75, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, "<");

		/* Take it down gently: the logo lifts away, then the blocks sink from tallest to smallest */
		tl.to([logo, logoShadow], { autoAlpha: 0, duration: 0.5, ease: "power2.in" }, "+=0.4");
		tl.to(logo, { y: -14, duration: 0.5, ease: "power2.in" }, "<");
		[3, 2, 1].forEach(function (k, n) {
			var block = blocks[k];
			tl.to(heights[k], {
				h: 0,
				duration: 0.55,
				ease: "power2.in",
				onUpdate: function () { block.draw(heights[k].h); }
			}, n === 0 ? ">-0.1" : "<0.15");
			tl.to(block.g, { autoAlpha: 0, duration: 0.2, ease: "none" }, "<0.4");
		});
		tl.to(blocks[0].g, { autoAlpha: 0, y: 16, duration: 0.45, ease: "power2.in" }, "<0.1");

		/* Starts when the illustration scrolls into view; pauses while it's off screen */
		function enter() {
			inView = true;
			if (waiting) { waiting = false; tl.restart(); }
			else tl.play();
		}

		function leave() {
			inView = false;
			tl.pause();
		}

		if (typeof window.ScrollTrigger !== "undefined") {
			ScrollTrigger.create({
				trigger: host,
				start: "top 75%",
				end: "bottom top",
				onEnter: enter,
				onEnterBack: enter,
				onLeave: leave,
				onLeaveBack: leave
			});
		} else {
			enter();
		}
	})();
})();
