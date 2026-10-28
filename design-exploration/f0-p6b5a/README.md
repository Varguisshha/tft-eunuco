# F0-P6B.5-A — exploración aislada

Abrir [galería](index.html). Para previews completos con módulos locales, iniciar desde la raíz del proyecto:

```sh
python3 -m http.server 4185 --bind 127.0.0.1 --directory design-exploration/f0-p6b5a
```

Visitar http://127.0.0.1:4185/. El servidor solo sirve esta carpeta; no inicia ni conecta el juego.

Cada dirección incluye screen-1920.png, inspector-1920.png, components-1920.png y su preview index.html (`?inspector`, `?detail`). Las PNG se abren directamente sin servidor. Se conservan fuentes/licencias y recursos locales. Comparativa y validación en comparison/REPORT.md; origen de assets en shared/assets/provenance.json.

Ningún preview modifica reglas, datos, guardados ni componentes de producción. Muestras estáticas de diseño, no una nueva versión jugable. La elección se hace antes de F0-P6B.5-B.
