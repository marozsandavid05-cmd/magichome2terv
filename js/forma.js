/* Magic Home · weboldal-2 · formajáték-mozgás.
   Egyetlen GSAP-mozdulat: a főoldali boltív görgetésre kinyílik (keskeny ajtóból teljes ablakká).
   A forma CSS-ben a végállapotban áll, ez csak ráépül: reduced-motion vagy hiányzó GSAP alatt nem fut. */
(function () {
  var d = document.documentElement;
  if (d.classList.contains('rm') || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  [].forEach.call(document.querySelectorAll('[data-forma="boltiv"] img'), function (img) {
    gsap.fromTo(img,
      { clipPath: 'inset(12% 24% 0% 24% round 999px 999px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)', ease: 'none',
        scrollTrigger: { trigger: img.closest('figure'), start: 'top 95%', end: 'top 35%', scrub: 0.6 } });
  });
})();
