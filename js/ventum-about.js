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
})();
