document.addEventListener('DOMContentLoaded',()=>ERP.initCrud('paises'));

// Exemplo de como deve estar no seu ../js/paises.js:
Swal.fire({
  title: 'País',
  html: `
    <p><b>Nome:</b> ${dados.nome}</p>
    <p><b>Sigla:</b> ${dados.sigla}</p>
    <p><b>DDI:</b> ${dados.ddi}</p>
    <p><b>Moeda:</b> ${dados.moeda || 'Não informada'}</p> 
    <p><b>Status:</b> ${dados.status}</p>
  `,
  icon: 'info'
});