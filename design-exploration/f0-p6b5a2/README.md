# F0-P6B.5-A2 — Festival Pop Color Exploration

Galería: http://127.0.0.1:4186/

Si el servidor no está activo, desde la raíz del repositorio:

```sh
python3 -m http.server 4186 --bind 127.0.0.1 --directory design-exploration/f0-p6b5a2
```

[Informe](comparison/REPORT.md) · [Contraste](comparison/CONTRAST.md) · [Contrato](comparison/CONTRACT.md).

Seis paletas, 18 PNG de 1920×1080, un renderer compartido de C, tokens por carpeta y galería comparativa con zoom al 100 %. Los archivos del juego y la exploración anterior no se modifican.

Para regenerar tokens desde las seis semillas, ejecutar `python3 design-exploration/f0-p6b5a2/comparison/build-palettes.py` desde la raíz. Eso no genera las capturas: deben volver a tomarse en el navegador con las fuentes cargadas. No es un script de producción.
