// jsdom window.scrollTo uygulamıyor; router'ın scrollBehavior'ı bunu çağırır.
window.scrollTo = () => {}
