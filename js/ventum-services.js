/* ----------------------------------------------------------------------------------------
* Ventum Software - Services page interactions
* Runs after ventum.js (which handles the hero title, year and menu). Degrades gracefully.
* ---------------------------------------------------------------------------------------- */
(function () {
	"use strict";

	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var hasIO = "IntersectionObserver" in window;

	function $all(sel, ctx) {
		return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
	}

	/* ------------------------------------------------------------------
	   Hero service flow: duplicate each track so the vertical loop is
	   seamless (CSS moves .vt-flow-move by -50%, i.e. exactly one track)
	------------------------------------------------------------------ */
	$all(".vt-flow-move").forEach(function (move) {
		var track = move.querySelector(".vt-flow-track");
		if (track) move.appendChild(track.cloneNode(true));
	});

	/* ------------------------------------------------------------------
	   Capabilities: highlight the card being read and its sidebar link
	------------------------------------------------------------------ */
	(function capabilitySpy() {
		var cards = $all(".vt-capability");
		var links = $all(".vt-sv-sidebar a[href^='#']");
		if (!cards.length || !hasIO) return;

		function activate(id) {
			cards.forEach(function (c) { c.classList.toggle("is-active", c.id === id); });
			links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + id); });
		}

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) { if (e.isIntersecting) activate(e.target.id); });
		}, { rootMargin: "-40% 0px -55% 0px" });

		cards.forEach(function (c) { io.observe(c); });
	})();

	/* ------------------------------------------------------------------
	   AI list: items switch on one after another when in view
	------------------------------------------------------------------ */
	(function aiList() {
		var list = document.querySelector(".vt-sv-ai-list");
		if (!list) return;
		$all("li", list).forEach(function (li, i) { li.style.setProperty("--i", i); });

		if (!hasIO || reduceMotion) { list.classList.add("is-inview"); return; }

		var io = new IntersectionObserver(function (entries) {
			if (entries[0].isIntersecting) {
				list.classList.add("is-inview");
				io.disconnect();
			}
		}, { threshold: 0.35 });
		io.observe(list);
	})();
})();
