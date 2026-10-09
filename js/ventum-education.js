/* ----------------------------------------------------------------------------------------
* Ventum Software - Education page interactions
* Runs after ventum.js (hero title, year, menu, AI stack, form) and ventum-services.js
* (experience sidebar). Degrades gracefully: without JS the first solution area stays on
* screen and the project cards are plain links.
* ---------------------------------------------------------------------------------------- */
(function () {
	"use strict";

	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var hasIO = "IntersectionObserver" in window;

	function $all(sel, ctx) {
		return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
	}

	/* ------------------------------------------------------------------
	   Hero: the platform cycles through the solution areas while it is
	   visible. Hovering pauses it; clicking an area shows that one.
	------------------------------------------------------------------ */
	(function areas() {
		var scene = document.querySelector(".vt-ed-scene");
		if (!scene) return;
		var items = $all(".vt-ed-areas li", scene);
		var panels = $all(".vt-ed-panel", scene);
		var INTERVAL = 3200;
		var current = 0, timer = 0, visible = true, hovered = false;

		scene.style.setProperty("--vt-ed-interval", INTERVAL + "ms");

		function show(i) {
			current = i;
			var area = items[i].getAttribute("data-area");
			items.forEach(function (li) {
				li.classList.remove("is-active");
				void li.offsetWidth; // restart the timer bar animation
				li.classList.toggle("is-active", li === items[i]);
			});
			panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-area") === area); });
		}

		function schedule() {
			clearTimeout(timer);
			var running = visible && !hovered && !document.hidden && !reduceMotion;
			scene.classList.toggle("is-cycling", running);
			if (!running) return;
			timer = setTimeout(function () {
				show((current + 1) % items.length);
				schedule();
			}, INTERVAL);
		}

		items.forEach(function (li, i) {
			li.addEventListener("click", function () { show(i); schedule(); });
		});
		scene.addEventListener("pointerenter", function () { hovered = true; schedule(); });
		scene.addEventListener("pointerleave", function () { hovered = false; show(current); schedule(); });

		if (hasIO) {
			new IntersectionObserver(function (entries) {
				visible = entries[0].isIntersecting;
				schedule();
			}, { threshold: 0.2 }).observe(scene);
		} else {
			schedule();
		}
		document.addEventListener("visibilitychange", schedule);
	})();

	/* ------------------------------------------------------------------
	   Capabilities: items switch on one after another when in view
	------------------------------------------------------------------ */
	(function feats() {
		var list = document.querySelector(".vt-ed-feats");
		if (!list) return;
		$all("li", list).forEach(function (li, i) { li.style.setProperty("--i", i); });

		if (!hasIO || reduceMotion) { list.classList.add("is-inview"); return; }

		var io = new IntersectionObserver(function (entries) {
			if (entries[0].isIntersecting) {
				list.classList.add("is-inview");
				io.disconnect();
			}
		}, { threshold: 0.25 });
		io.observe(list);
	})();

	/* ------------------------------------------------------------------
	   Client case studies and product use cases: each card opens an
	   expanded view built from the card itself. The URL hash follows the
	   open card, so a link like education.html#use-case-class-assignment
	   opens it directly.
	------------------------------------------------------------------ */
	(function projects() {
		var modal = document.getElementById("vtEdModal");
		var cards = $all(".vt-ed-project");
		if (!modal || !cards.length || typeof modal.showModal !== "function") return;

		var media = modal.querySelector(".vt-ed-modal-media");
		var client = modal.querySelector(".vt-ed-modal-client");
		var title = modal.querySelector("h2");
		var desc = modal.querySelector(".vt-ed-modal-desc");
		var story = modal.querySelector(".vt-ed-modal-story");
		var steps = story.querySelector("ol");
		var root = document.documentElement;

		function setHash(hash) {
			if (window.history && history.replaceState) {
				history.replaceState(null, "", hash || window.location.pathname + window.location.search);
			}
		}

		function open(card) {
			media.innerHTML = "";
			media.appendChild(card.querySelector(".vt-ed-preview").cloneNode(true));
			title.textContent = card.querySelector(".vt-ed-project-head strong").textContent;
			desc.textContent = card.querySelector(".vt-ed-project-desc").textContent;
			/* The small tag above the title only shows when the card has one */
			var tag = card.querySelector(".vt-ed-project-client");
			client.textContent = tag ? tag.textContent : "";
			client.hidden = !tag;

			/* Step-by-step story: only shown once a project has its steps written */
			var items = $all(".vt-ed-project-steps li", card);
			steps.innerHTML = "";
			items.forEach(function (li) { steps.appendChild(li.cloneNode(true)); });
			story.hidden = !items.length;

			modal.showModal();
			modal.scrollTop = 0;
			modal.querySelector(".vt-ed-modal-body").scrollTop = 0;
			root.style.overflow = "hidden";
			setHash(card.getAttribute("href"));
		}

		function close() {
			if (modal.open) modal.close();
		}

		modal.addEventListener("close", function () {
			root.style.overflow = "";
			if (/^#(client|use-case)-/.test(window.location.hash)) setHash("");
		});

		cards.forEach(function (card) {
			card.addEventListener("click", function (e) {
				if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
				e.preventDefault();
				open(card);
			});
		});

		modal.querySelector(".vt-ed-modal-close").addEventListener("click", close);

		/* Clicking the backdrop (outside the dialog box) closes it */
		modal.addEventListener("click", function (e) {
			if (e.target !== modal) return;
			var r = modal.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
			if (!inside) close();
		});

		/* The CTA scrolls to the contact form once the dialog is out of the way */
		modal.querySelector(".vt-ed-modal-cta").addEventListener("click", close);

		var initial = cards.filter(function (c) { return c.getAttribute("href") === window.location.hash; })[0];
		if (initial) open(initial);
	})();
})();
