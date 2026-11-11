/* =========================================================================
   Google Tag Manager

   El contenedor de GTM, no Google Analytics directamente: la etiqueta de GA4
   (y cualquier otra) se configura dentro de Tag Manager, no aqui. Para medir
   algo nuevo se toca el contenedor en tagmanager.google.com; este archivo no
   hay que volver a abrirlo.

   El ID va aqui y solo aqui. Las nueve paginas del sitio cargan este archivo,
   asi que cambiar la linea de abajo lo cambia en todas. El snippet de Google
   es para pegarlo en el <head> de cada pagina, pero aqui son nueve <head>
   escritos a mano y el ID acabaria repetido en nueve sitios.

   De donde sale el ID: Tag Manager > Administrar > Instrucciones de
   instalacion. Tiene la forma GTM-XXXXXXX.

   Si GTM_ID se deja vacio, este archivo no hace nada: ni descarga gtm.js, ni
   pone cookies, ni envia eventos.
   ========================================================================= */

const GTM_ID = 'GTM-5QXZCPSV';

if (GTM_ID) {
  /* Snippet oficial de Google. La funcion gtag tiene que usar "arguments" y
     no parametros rest: la cola espera un objeto Arguments, y con (...args)
     se le pasaria un array y los eventos dejarian de registrarse. */
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());

  /* dataLayer es una cola: da igual que gtm.js llegue despues, al cargarse
     procesa lo que ya se encolo arriba. */
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
  document.head.appendChild(tag);
}
