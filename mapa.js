// Inicialización del mapa centrado en Traslasierra
const map = L.map("mapa").setView([0.11, -26.46], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Grupo para clustering de marcadores
const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

// Referencia al select del filtro
const filtroPeriodo = document.getElementById("filtroPeriodo");

// Asegura que la opción "todos" esté presente en el HTML o la añade
if (![...filtroPeriodo.options].some(opt => opt.value === "todos")) {
  const todosOption = document.createElement("option");
  todosOption.value = "todos";
  todosOption.textContent = "Todos los períodos";
  filtroPeriodo.appendChild(todosOption);
}

let eventos = [];

// Cargar datos desde JSON externo
fetch("eventos.json")
  .then((response) => {
    if (!response.ok) throw new Error("No se pudo cargar eventos.json");
    return response.json();
  })
  .then((data) => {
    eventos = data;

    // Obtener períodos únicos y ordenarlos
    const periodosUnicos = [...new Set(eventos.map((e) => e.periodo))].sort();
    
    periodosUnicos.forEach((periodo) => {
      const option = document.createElement("option");
      option.value = periodo;
      option.textContent = periodo;
      filtroPeriodo.appendChild(option);
    });

    cargarMarcadores("todos");
  })
  .catch((error) => {
    console.error("Error cargando eventos.json:", error);
  });

// Función para cargar marcadores filtrados por período
function cargarMarcadores(periodoSeleccionado) {
  markerCluster.clearLayers();

  eventos
    .filter((evento) =>
      periodoSeleccionado === "todos" || evento.periodo === periodoSeleccionado
    )
    .forEach((evento) => {
      if (
        !evento.ubicacion ||
        !Array.isArray(evento.ubicacion) ||
        evento.ubicacion.length !== 2
      ) {
        console.warn("Evento con ubicación inválida:", evento);
        return;
      }

      const marker = L.marker(evento.ubicacion);

      // Crear contenido del popup con enlace
      const popupContent = `
        <strong>${evento.titulo}</strong><br/>
        Fecha: ${evento.fecha}<br/>
        <a href="evento${evento.id}.html" target="_blank">Ver detalle</a>
      `;

      marker.bindPopup(popupContent);

      // Abrir directamente la página del evento al hacer clic en el marcador
      marker.on("click", () => {
        window.open(`evento${evento.id}.html`, "_blank");
      });

      markerCluster.addLayer(marker);
    });
}

// Manejo del cambio de selección en el filtro
filtroPeriodo.addEventListener("change", () => {
  cargarMarcadores(filtroPeriodo.value);
});
