// El problema principal suele ser que el contenido del popup se genera como HTML
// y el botón dentro no tiene asignado el event listener porque el DOM del popup
// se crea dinámicamente y el código debe añadir el listener *después* de abrir el popup.

// Aquí el código completo con corrección para asegurar que el botón "Ver más" funcione correctamente:

// Estado inicial por defecto
const posicionInicialPorDefecto = [0, 0];
const zoomInicialPorDefecto = 2;

function guardarEstadoMapa() {
  const centro = map.getCenter();
  const zoom = map.getZoom();
  localStorage.setItem("mapa_lat", centro.lat);
  localStorage.setItem("mapa_lng", centro.lng);
  localStorage.setItem("mapa_zoom", zoom);
}

function cargarEstadoMapa() {
  const lat = parseFloat(localStorage.getItem("mapa_lat"));
  const lng = parseFloat(localStorage.getItem("mapa_lng"));
  const zoom = parseInt(localStorage.getItem("mapa_zoom"), 10);

  if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
    return { posicion: [lat, lng], zoom: zoom };
  }
  return { posicion: posicionInicialPorDefecto, zoom: zoomInicialPorDefecto };
}

const estadoGuardado = cargarEstadoMapa();

const map = L.map("mapa").setView(estadoGuardado.posicion, estadoGuardado.zoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

map.on("moveend", guardarEstadoMapa);
map.on("zoomend", () => {
  abrirPopupCercanoAlCentro();
  guardarEstadoMapa();
});

const botonInicio = L.control({ position: "topright" });
botonInicio.onAdd = function () {
  const div = L.DomUtil.create("div");
  div.innerHTML = `
    <button title="Volver a inicio"
      style="
        background:#007bff;
        color:white;
        padding:8px 12px;
        border:none;
        border-radius:5px;
        cursor:pointer;
        font-weight:bold;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      ">
      🔄 Inicio
    </button>`;
  div.onclick = () => {
    map.setView(posicionInicialPorDefecto, zoomInicialPorDefecto);
    filtroPeriodo.value = "todos";
    filtroPais.value = "todos";
    busquedaTitulo.value = "";
    actualizarEventos();
    localStorage.removeItem("mapa_lat");
    localStorage.removeItem("mapa_lng");
    localStorage.removeItem("mapa_zoom");
  };
  return div;
};
botonInicio.addTo(map);

const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

const filtroPeriodo = document.getElementById("filtroPeriodo");
const filtroPais = document.getElementById("filtroPais");
const busquedaTitulo = document.getElementById("busquedaTitulo");
const mensajeNoEventos = document.getElementById("mensaje-no-eventos");
const contenedorListaEventos = document.getElementById("lista-eventos");
const contadorEventos = document.getElementById("contador-eventos");

let eventos = [];
let marcadores = [];

let popupCerrarTimeout = null;

fetch("eventos.json")
  .then((res) => {
    if (!res.ok) throw new Error("No se pudo cargar eventos.json");
    return res.json();
  })
  .then((data) => {
    eventos = data;
    llenarFiltroPeriodos();
    llenarFiltroPaises();
    crearMarcadores();
    actualizarEventos();
  })
  .catch((error) => {
    console.error("Error al cargar eventos:", error);
  });

function llenarFiltroPeriodos() {
  const periodosUnicos = [...new Set(eventos.map((e) => e.periodo))].sort();
  periodosUnicos.forEach((periodo) => {
    const option = document.createElement("option");
    option.value = periodo;
    option.textContent = periodo;
    filtroPeriodo.appendChild(option);
  });
}

function llenarFiltroPaises() {
  const paisesUnicos = [...new Set(eventos.map((e) => e.pais))].sort();
  paisesUnicos.forEach((pais) => {
    const option = document.createElement("option");
    option.value = pais;
    option.textContent = pais;
    filtroPais.appendChild(option);
  });
}

function crearMarcadores() {
  marcadores = eventos
    .map((evento) => {
      if (!(evento.ubicacion && evento.ubicacion.length === 2)) return null;

      const marker = L.marker(evento.ubicacion);
      marker.eventoId = evento.id;

      const popupContent = `
      <div style="max-width:250px; cursor: default;">
        <h3>${evento.titulo}</h3>
        <p><strong>Fecha:</strong> ${evento.fecha}</p>
        <p><strong>Período:</strong> ${evento.periodo}</p>
        <p><strong>País:</strong> ${evento.pais || "Desconocido"}</p>
        <p>${evento.descripcion || ""}</p>
        ${
          evento.media
            ? `<img src="${evento.media}" alt="${evento.titulo}" style="width:100%;border-radius:6px;margin-top:5px;" />`
            : ""
        }
        <button class="btn-ver-mas" style="margin-top:10px;padding:6px 10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer">
          Ver más
        </button>
      </div>`;

      marker.bindPopup(popupContent);

      // Abrimos popup al pasar mouse pero sin cerrarlo al salir para permitir click
      marker.on("mouseover", () => {
        marker.openPopup();
      });
      // No cerramos popup en mouseout para permitir usar el botón

      // Al abrir el popup, asignamos el listener al botón "Ver más"
      marker.on("popupopen", () => {
        const popupEl = marker.getPopup().getElement();
        if (popupEl) {
          const btnVerMas = popupEl.querySelector(".btn-ver-mas");
          if (btnVerMas) {
            btnVerMas.onclick = (e) => {
              e.stopPropagation(); // Evita cerrar popup al click
              window.location.href = `evento${evento.id}.html`;
            };
          }
        }
      });

      return marker;
    })
    .filter(Boolean);
}

function cerrarPopups() {
  if (popupCerrarTimeout) {
    clearTimeout(popupCerrarTimeout);
    popupCerrarTimeout = null;
  }
  marcadores.forEach((m) => m.closePopup());
}

function actualizarEventos() {
  markerCluster.clearLayers();
  contenedorListaEventos.innerHTML = "";

  const periodoSel = filtroPeriodo.value;
  const paisSel = filtroPais.value;
  const textoBusqueda = busquedaTitulo.value.trim().toLowerCase();

  const eventosFiltrados = eventos.filter(
    (e) =>
      (periodoSel === "todos" || e.periodo === periodoSel) &&
      (paisSel === "todos" || e.pais === paisSel) &&
      e.titulo.toLowerCase().includes(textoBusqueda)
  );

  mensajeNoEventos.style.display = eventosFiltrados.length === 0 ? "block" : "none";
  contadorEventos.textContent = `${eventosFiltrados.length} evento(s) encontrados.`;

  const marcadoresFiltrados = marcadores.filter((m) => {
    const evento = eventos.find((e) => e.id === m.eventoId);
    return eventosFiltrados.includes(evento);
  });

  marcadoresFiltrados.forEach((m) => markerCluster.addLayer(m));

  eventosFiltrados.forEach((evento) => {
    const div = document.createElement("div");
    div.className = "item-lista-evento";
    div.innerHTML = `<strong>${evento.titulo}</strong> (${evento.fecha})`;
    div.tabIndex = 0;

    div.addEventListener("click", () => {
      map.flyTo(evento.ubicacion, 8, { duration: 1.5 });
      cerrarPopups();
      const marker = marcadores.find((m) => m.eventoId === evento.id);
      if (marker) {
        marker.openPopup();
      }
    });

    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        div.click();
      }
    });

    contenedorListaEventos.appendChild(div);
  });
}

filtroPais.addEventListener("change", () => {
  actualizarEventos();

  const paisSeleccionado = filtroPais.value;
  if (paisSeleccionado === "todos") {
    map.setView(posicionInicialPorDefecto, zoomInicialPorDefecto);
    return;
  }

  const ubicaciones = eventos
    .filter((e) => e.pais === paisSeleccionado && e.ubicacion?.length === 2)
    .map((e) => e.ubicacion);

  if (ubicaciones.length > 0) {
    const bounds = L.latLngBounds(ubicaciones);
    map.flyToBounds(bounds, { padding: [30, 30], maxZoom: 8 });
  }
});

function abrirPopupCercanoAlCentro() {
  cerrarPopups();

  const centro = map.getCenter();
  let marcadorCercano = null;
  let distanciaMin = Infinity;

  marcadores.forEach((marker) => {
    const latLng = marker.getLatLng();
    const distancia = centro.distanceTo(latLng);
    if (distancia < distanciaMin) {
      distanciaMin = distancia;
      marcadorCercano = marker;
    }
  });

  if (marcadorCercano) {
    marcadorCercano.openPopup();

    popupCerrarTimeout = setTimeout(() => {
      marcadorCercano.closePopup();
      popupCerrarTimeout = null;
    }, 3000);
  }
}

function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

filtroPeriodo.addEventListener("change", actualizarEventos);
busquedaTitulo.addEventListener("input", debounce(actualizarEventos, 300));
