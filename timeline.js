// timeline.js

// Asegúrate de que este script se incluya en la página HTML que contiene el timeline

// JSON de eventos cargado desde un archivo o variable
// Suponemos que `eventos` es una lista con todos los objetos de eventos históricos

fetch("eventos.json")
  .then(response => response.json())
  .then(eventos => {
    const container = document.getElementById("timeline-container");

    eventos.forEach(evento => {
      const card = document.createElement("div");
      card.className = "event-card";

      const titulo = document.createElement("h3");
      titulo.textContent = evento.titulo;

      const fecha = document.createElement("p");
      fecha.textContent = `Fecha: ${evento.fecha}`;

      const descripcion = document.createElement("p");
      descripcion.textContent = evento.descripcion;

      card.appendChild(titulo);
      card.appendChild(fecha);
      card.appendChild(descripcion);

      card.addEventListener("dblclick", () => {
        const url = `evento${evento.id}.html`;
        window.open(url, "_blank");
      });

      container.appendChild(card);
    });
  })
  .catch(error => {
    console.error("Error al cargar eventos:", error);
  });
