"""Interfaz de tienda. Requiere Playwright instalado con Chromium y Firefox."""
import json
import os
import re
import time
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

url = os.environ.get("DEMO_URL", "http://127.0.0.1:4200")
out = Path(os.environ.get("BROWSER_EVIDENCE", "Back_End/browser-evidence"))
out.mkdir(parents=True, exist_ok=True)
nonce = time.time_ns()
results = {"navegadores": {}, "tareas": []}

def photo(page, name):
    page.screenshot(path=str(out / f"{name}.jpg"), type="jpeg", quality=83, animations="disabled")

def activity(name, actual):
    results["tareas"].append({"tarea": name, "resultado": actual})
    print(name + " - " + actual, flush=True)

def address(page):
    for label, value in {
        "Destinatario": "Cuenta académica", "Calle y número": "Av. Ejemplo 100",
        "Municipio": "Nuevo Laredo", "Estado": "Tamaulipas", "Código postal": "88000"
    }.items():
        page.get_by_label(label, exact=True).fill(value)
    page.get_by_role("button", name="Guardar dirección").click()
    expect(page.get_by_role("button", name="Confirmar pedido")).to_be_visible()

def performance(page):
    return page.evaluate("""() => {
      const n = performance.getEntriesByType('navigation')[0];
      return {domContentLoadedMs: Math.round(n.domContentLoadedEventEnd), loadMs: Math.round(n.loadEventEnd),
      transfers: Math.round(n.transferSize + performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0))};
    }""")

with sync_playwright() as p:
    opts = {}
    if os.environ.get("CHROMIUM_EXECUTABLE"):
        opts["executable_path"] = os.environ["CHROMIUM_EXECUTABLE"]
    firefox_only = os.environ.get("DEMO_SINGLE_BROWSER") == "firefox"
    chrome = p.firefox.launch() if firefox_only else p.chromium.launch(**opts)
    primary = "Firefox" if firefox_only else "Chromium"
    client = chrome.new_page(viewport={"width": 1280, "height": 890})
    violations = []
    client.on("pageerror", lambda err: violations.append(str(err)))
    client.on("console", lambda msg: violations.append(msg.text) if "Content Security Policy" in msg.text else None)
    client.goto(url, wait_until="load")
    expect(client.get_by_role("heading", name="Selección destacada")).to_be_visible()
    expect(client.get_by_text("Horizonte de Cobre", exact=True)).to_be_visible()
    photo(client, "E01-inicio")
    results["navegadores"][primary] = {"version": chrome.version, "inicio": performance(client)}
    client.keyboard.press("Tab")
    expect(client.get_by_role("link", name="Saltar al contenido")).to_be_focused()
    client.keyboard.press("Enter")
    expect(client.locator("#content")).to_be_focused()
    search = client.get_by_role("searchbox", name="Buscar en la tienda")
    search.fill("m")
    search.press("Enter")
    expect(client.get_by_text("1 producto · página 1")).to_be_visible()
    expect(client.get_by_text("Marea de Hierro", exact=True)).to_be_visible()
    search.fill("Horizonte")
    search.press("Enter")
    expect(client.get_by_text("2 productos · página 1")).to_be_visible()
    photo(client, "E02-catalogo")
    client.get_by_role("link", name="Ficha de Horizonte de Cobre", exact=True).click()
    expect(client.get_by_role("heading",name="Horizonte de Cobre",exact=True)).to_be_visible()
    expect(client.get_by_text("Ediciones disponibles")).to_be_visible()
    photo(client, "E03-ficha")
    activity("Buscar y consultar", "Enter sin iniciar sesión: inicial M, dos resultados por nombre y ficha con variante")
    client.get_by_role("button", name="Agregar al carrito").click()
    expect(client.get_by_role("status")).to_have_text(re.compile("agregó"))
    client.get_by_role("link", name=re.compile("^Carrito")).click()
    client.get_by_label("Cantidad de Horizonte de Cobre").fill("2")
    client.get_by_role("button",name="Actualizar").click()
    expect(client.get_by_text("MXN\xa0698.00")).to_be_visible()
    photo(client, "E04-carrito")
    activity("Operar carrito", "Ajuste de cantidad y subtotal confirmados")
    client.get_by_role("link",name="Continuar al checkout").click()
    client.get_by_role("button",name="Registrarme").click()
    client.get_by_label("Nombre",exact=True).fill("Cuenta académica")
    client.get_by_label("Correo electrónico").fill(f"demo-{nonce}@example.test")
    client.get_by_label("Contraseña",exact=True).fill("Prueba-Navegador-2026")
    client.get_by_text("Acepto los términos y consulté el aviso de privacidad.").click()
    client.get_by_role("button",name="Crear cuenta").click()
    expect(client.get_by_role("heading",name="Contacto y entrega")).to_be_visible(timeout=15000)
    address(client)
    client.get_by_label("Cupón").fill("DEMO10")
    client.get_by_role("button", name="Aplicar cupón").click()
    expect(client.get_by_text("MXN\xa0628.20")).to_be_visible()
    photo(client, "E05-checkout")
    client.get_by_text(re.compile("Acepto los términos de la versión")).click()
    client.get_by_role("button",name="Confirmar pedido").click()
    expect(client.get_by_role("heading",name="Simulador de pago")).to_be_visible()
    client.get_by_role("button",name="Aprobar pago de prueba").click()
    expect(client.get_by_role("heading",name=re.compile(r"MG-[0-9A-F]+ · Pagado"))).to_be_visible()
    folio=client.locator('h2').filter(has_text="· Pagado").inner_text().split(" · ")[0]
    photo(client, "E06-confirmacion")
    activity("Confirmar compra", "Aceptación, pago simulado, descuento y folio " + folio)
    mobile = p.firefox.launch()
    manager = mobile.new_page(viewport={"width": 1160, "height": 850})
    manager.goto(url+"/#cuenta",wait_until="load")
    manager.get_by_label("Correo electrónico").fill(os.environ["DEMO_ADMIN_EMAIL"])
    manager.get_by_label("Contraseña",exact=True).fill(os.environ["DEMO_ADMIN_PASSWORD"])
    manager.get_by_role("button",name="Iniciar sesión",exact=True).click()
    expect(manager.get_by_role("heading", name="Indicadores de operación")).to_be_visible(timeout=15000)
    photo(manager,"E07-admin")
    manager.get_by_role("button",name="Pedidos",exact=True).click()
    manager.get_by_role("button",name="Ver "+folio).click()
    for text in ["Marcar En preparación","Marcar Enviado","Marcar Entregado"]:
        manager.get_by_role("button",name=text).click()
    expect(manager.get_by_role("heading",name=folio+" · Entregado")).to_be_visible()
    photo(manager,"E08-pedido-admin")
    activity("Operar pedido", "Administración cambió la secuencia hasta Entregado en Firefox")
    client.reload()
    expect(client.get_by_role("heading",name=folio+" · Entregado")).to_be_visible()
    expect(client.get_by_text("Código de entrega de prueba")).to_be_visible()
    client.get_by_label("Tipo de solicitud").select_option("return")
    client.get_by_label("Motivo",exact=True).fill("Prueba académica de devolución.")
    client.get_by_role("button",name="Enviar solicitud").click()
    expect(client.get_by_role("status")).to_have_text(re.compile("folio AT-"))
    ticket=client.get_by_role("status").inner_text().split("folio ")[1].rstrip(".")
    client.get_by_role("link",name="Mi cuenta").click()
    expect(client.get_by_text(ticket+" · Devolución en proceso")).to_be_visible()
    manager.get_by_role("button",name="Solicitudes",exact=True).click()
    card=manager.locator("article").filter(has_text=ticket)
    card.get_by_label("Resultado").select_option("approved")
    card.get_by_label("Acción").select_option("refund")
    card.get_by_label("Fundamento o solicitud").fill("Devolución simulada aprobada.")
    card.get_by_role("button",name="Registrar resolución").click()
    expect(card.get_by_role("heading")).to_have_text(re.compile("Aprobado"))
    photo(manager,"E09-resolucion")
    client.reload()
    expect(client.get_by_text(ticket+" · Devolución completada")).to_be_visible()
    activity("Solicitar devolución", "Folio " + ticket + " visible para comprador y resolución aplicada")
    for engine,browser in ([(primary,chrome)] if firefox_only else [(primary,chrome),("Firefox",mobile)]):
        results["navegadores"].setdefault(engine,{"version":browser.version})
        for width in [360,768,1280]:
            screen=browser.new_page(viewport={"width":width,"height":900})
            screen.goto(url+"/#catalogo",wait_until="load")
            expect(screen.get_by_role("heading",name="Catálogo",exact=True)).to_be_visible()
            expect(screen.get_by_text("Horizonte de Cobre", exact=True)).to_be_visible()
            assert screen.locator("body").evaluate("(el) => el.scrollWidth")<=width, (engine,width)
            assert screen.locator('label').count()>=5
            if width==360 and engine=="Firefox":
                photo(screen,"E10-movil")
            screen.close()
        results["navegadores"][engine]["anchosPx"]=[360,768,1280]
    client.get_by_role("button", name="Cerrar sesión").click()
    expect(client.get_by_role("heading", name=re.compile("Tu próxima"))).to_be_visible()
    client.get_by_role("link", name="Iniciar sesión").click()
    client.get_by_label("Correo electrónico").fill(f"demo-{nonce}@example.test")
    client.get_by_label("Contraseña", exact=True).fill("Prueba-Navegador-2026")
    client.get_by_role("button", name="Iniciar sesión", exact=True).click()
    expect(client.get_by_role("heading", name=re.compile("Tu próxima"))).to_be_visible()
    expect(client.get_by_role("link", name="Mi cuenta")).to_be_visible()
    results["autenticacion"] = "El cliente vuelve a Inicio con su cuenta activa"
    assert not violations, violations
    chrome.close()
    mobile.close()
(out / "resultados.json").write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding="utf-8")
