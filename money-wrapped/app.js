/* Money Wrapped: wat je ziet. Leest je bestand, laat de rekenkern (engine.js)
   zijn werk doen en tekent één kort overzicht: je jaar, drie acties en je
   abonnementen. De rest zit ingeklapt onder "Meer inzicht". */
(function () {
  'use strict';

  var MW = window.MW;
  if (!MW || !document.getElementById('resultaat')) return;

  var STIL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var OPSLAG = 'mw-verplaatst';
  var TOP_ACTIES = 3, TOP_ABOS = 5, TOP_CATS = 5;
  var st = { lijsten: null, voorbeeld: false, data: null, periodes: [], periode: null, res: null, open: {} };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var euro = MW.euro, datum = MW.datum;
  function hoofdletter(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // wat je zelf naar een andere categorie hebt verplaatst, blijft op dit apparaat
  function eigenRegels() { try { return JSON.parse(window.localStorage.getItem(OPSLAG) || '{}') || {}; } catch (e) { return {}; } }
  function bewaarRegels(r) { try { window.localStorage.setItem(OPSLAG, JSON.stringify(r)); } catch (e) {} }

  /* ---------- bestand laden ---------- */

  function fout(tekst) {
    var el = $('fout');
    el.textContent = tekst || '';
    el.hidden = !tekst;
    if (tekst) $('start').hidden = false;
  }

  function leesBestand(file) {
    return new Promise(function (ok, mis) {
      var lezer = new FileReader();
      lezer.onerror = function () { mis(new Error('Ik kan ' + file.name + ' niet lezen.')); };
      lezer.onload = function () {
        var buf = lezer.result, tekst;
        try { tekst = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
        catch (e) { tekst = new TextDecoder('windows-1252').decode(buf); }
        try { ok(MW.leesING(tekst)); }
        catch (e2) { mis(new Error(file.name + ': ' + e2.message)); }
      };
      lezer.readAsArrayBuffer(file);
    });
  }

  function laadBestanden(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    fout('');
    Promise.all(files.map(leesBestand)).then(function (lijsten) { begin(lijsten, false, true); }, function (e) { fout(e.message); });
  }

  // voor het laden zie je de uitleg, erna alleen je overzicht
  function wissel(metResultaat) {
    $('start').hidden = metResultaat;
    $('uitleg').hidden = metResultaat;
    $('veilig').hidden = metResultaat;
    $('resultaat').hidden = !metResultaat;
  }

  function begin(lijsten, voorbeeld, scroll) {
    try {
      st.lijsten = lijsten; st.voorbeeld = voorbeeld; st.open = {}; st.periode = null;
      reken();
    } catch (e) { fout(e.message); return; }
    wissel(true);
    teken();
    if (scroll && $('balk').scrollIntoView) $('balk').scrollIntoView({ block: 'start', behavior: STIL ? 'auto' : 'smooth' });
  }

  function reken() {
    st.data = MW.maakData(st.lijsten, eigenRegels());
    st.periodes = MW.periodes(st.data);
    var id = st.periode && st.periode.id;
    st.periode = st.periodes.filter(function (p) { return p.id === id; })[0] || st.periodes.filter(function (p) { return p.standaard; })[0] || st.periodes[0];
    st.res = MW.analyseer(st.data, st.periode);
  }

  function opnieuw() {
    st.lijsten = null; st.data = null; st.res = null;
    wissel(false);
    $('bestand').value = '';
    $('start').scrollIntoView({ block: 'center', behavior: STIL ? 'auto' : 'smooth' });
  }

  function teken() {
    tekenBalk();
    tekenJaar();
    tekenActies();
    tekenAbos();
    tekenCats();
    tekenVast();
    tekenGrootste();
    tekenAI();
  }

  /* ---------- de balk ---------- */

  function tekenBalk() {
    var d = st.data, html = '';
    html += '<p class="mw-bar-note">' + (st.voorbeeld
      ? '<strong>Dit is een voorbeeld met verzonnen cijfers.</strong> Laad je eigen bestand om je eigen jaar te zien.'
      : '<strong>Je eigen cijfers.</strong> ' + MW.getal(d.txs.length) + ' regels, van ' + datum(d.begin, true) + ' tot en met ' + datum(d.eind, true) + '.') + '</p>';
    if (st.periodes.length > 1) {
      html += '<div class="mw-pills" role="group" aria-label="Kies de periode">' + st.periodes.map(function (p) {
        return '<button class="mw-pill" type="button" data-periode="' + esc(p.id) + '" aria-pressed="' + (p === st.periode) + '">' + esc(p.label) + '</button>';
      }).join('') + '</div>';
    }
    html += '<div class="mw-bar-links"><button class="mw-link" type="button" data-actie="opnieuw">' + (st.voorbeeld ? 'Laad je eigen bestand' : 'Ander bestand laden') + '</button>';
    if (Object.keys(eigenRegels()).length) html += '<button class="mw-link" type="button" data-actie="wis">Wis mijn eigen indeling</button>';
    html += '</div>';
    $('balk').innerHTML = html;
  }

  /* ---------- je jaar: vier cijfers, de grootste categorieën, de maanden ---------- */

  function tekenJaar() {
    var r = st.res, P = r.periode, sal = r.inkomen.filter(function (c) { return c.id === 'salaris'; })[0];
    $('jaar-kop').textContent = P.jaar ? 'Je jaar ' + P.jaar : P.id === '12m' ? 'Je laatste twaalf maanden' : 'Je overzicht';

    function tegel(label, waarde, sub) {
      return '<div class="mw-tile"><span class="caps">' + label + '</span><span class="mw-tile-value">' + waarde + '</span><span class="mw-tile-sub">' + sub + '</span></div>';
    }
    $('tegels').innerHTML =
      tegel('Binnengekomen', euro(r.binnen, false), sal ? 'waarvan ' + euro(sal.totaal, false) + ' salaris' : MW.meervoud(r.inkomen.length, 'bron', 'bronnen')) +
      tegel('Uitgegeven', euro(r.uit, false), euro(r.perMaand, false) + ' per maand') +
      tegel(r.over >= 0 ? 'Over' : 'Tekort', euro(Math.abs(r.over), false),
        r.sparen > 0 ? euro(r.sparen, false) + ' ging naar sparen' : r.sparen < 0 ? euro(-r.sparen, false) + ' kwam van je spaargeld' : r.binnen > 0 ? Math.round(r.over / r.binnen * 100) + '% van wat binnenkwam' : '') +
      tegel('Vast per maand', euro(r.vastPerMaand, false), MW.meervoud(r.vast.length, 'vaste last', 'vaste lasten'));

    // de grootste categorieën, de rest in één regel
    var top = r.cats.slice(0, TOP_CATS), rest = r.cats.slice(TOP_CATS), max = top.length ? top[0].totaal : 1;
    var restTotaal = rest.reduce(function (t, c) { return t + c.totaal; }, 0);
    $('top-cats').innerHTML = top.map(function (c) {
      return '<li><span class="mw-topcats-name">' + esc(c.label) + '</span><span class="mw-topcats-val">' + euro(c.totaal, false) + '</span>' +
        '<span class="mw-topcats-track"><span style="width:' + Math.max(1, c.totaal / max * 100).toFixed(1) + '%"></span></span></li>';
    }).join('') + (rest.length ? '<li class="is-rest"><span class="mw-topcats-name">Nog ' + rest.length + ' categorieën</span><span class="mw-topcats-val">' +
      euro(restTotaal, false) + '</span><span class="mw-topcats-track"><span style="width:' + Math.min(100, Math.max(1, restTotaal / max * 100)).toFixed(1) + '%"></span></span></li>' : '');

    tekenMaanden();
  }

  function tekenMaanden() {
    var r = st.res, ms = r.maanden, max = Math.max.apply(null, ms.map(function (m) { return m.uit; }).concat([1]));
    var heel = ms.filter(function (m) { return m.heel; }), gem = heel.length ? heel.reduce(function (t, m) { return t + m.uit; }, 0) / heel.length : r.perMaand;
    var meerJaar = ms.length && ms[0].jaar !== ms[ms.length - 1].jaar;
    var html = '<div class="mw-plot"><div class="mw-cols">' + ms.map(function (m) {
      var h = Math.max(0, m.uit / max * 100), top = m === r.duursteMaand && ms.length >= 3;
      return '<button class="mw-col' + (top ? ' is-top' : '') + (m.heel ? '' : ' is-part') + '" type="button" data-tip="<b>' + esc(hoofdletter(m.naam) + ' ' + m.jaar) + '</b>' +
        esc(euro(m.uit, false) + ' uit, ' + euro(m.binnen, false) + ' binnen' + (m.heel ? '' : '. Deze maand is niet compleet.')) + '" aria-label="' +
        esc(m.naam + ' ' + m.jaar + ': ' + euro(m.uit, false) + ' uit') + '"><span class="mw-col-bar" style="height:' + h.toFixed(1) + '%"></span>' +
        (top ? '<span class="mw-col-val" style="bottom:' + h.toFixed(1) + '%">' + euro(m.uit, false) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    if (heel.length >= 3) html += '<div class="mw-avg" style="bottom:' + (gem / max * 100).toFixed(1) + '%"></div>';
    html += '</div><div class="mw-xlabels' + (ms.length > 13 ? ' is-dense' : '') + '">' + ms.map(function (m) {
      return '<span>' + (ms.length > 13 ? m.kort : m.kort.charAt(0)) + (meerJaar && m.maand === 1 && ms.length <= 13 ? '’' + String(m.jaar).slice(2) : '') + '</span>';
    }).join('') + '</div><p class="mw-chart-note">';
    if (heel.length >= 3) html += '<span><i></i>Gemiddeld ' + euro(gem, false) + ' per maand</span>';
    if (ms.some(function (m) { return !m.heel; })) html += '<span>Licht: maand niet compleet</span>';
    $('maanden').innerHTML = html + '</p>';
  }

  /* ---------- opzeggen: de pagina van de aanbieder, of anders een zoekopdracht ---------- */

  var PIJL = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6"/><path d="M4 3h5v5"/></svg>';
  function opzegLink(s) {
    var info = MW.opzeggen[s.naam], attrs = ' target="_blank" rel="noopener noreferrer"';
    if (info) return '<a class="mw-go" href="' + esc(info.url) + '"' + attrs + '>' + (info.uitleg ? 'Zo zeg je op' : 'Opzeggen') + PIJL + '</a>';
    return '<a class="mw-go is-zoek" href="https://www.google.com/search?q=' + encodeURIComponent(s.naam + ' abonnement opzeggen') + '"' + attrs + '>Zoek hoe je opzegt' + PIJL + '</a>';
  }

  // één regel voor een abonnement of vaste last
  function regel(s, metLink, metCat) {
    var r = st.res, bits = [];
    if (metCat) bits.push(esc(MW.cats[s.cat].label));
    if (s.stijging) bits.push('<b>Duurder geworden</b>, was ' + euro(s.stijging.van));
    if (s.ritme.id === 'jaar' && s.volgende >= r.eind - 7 && s.volgende <= r.eind + 100) bits.push('<b>Verlengt rond ' + datum(s.volgende) + '</b>');
    else if (s.onzeker) bits.push('Eén keer gezien, waarschijnlijk per jaar');
    else if (s.eerste > st.data.begin + 40 && s.eerste >= r.periode.van) bits.push('Nieuw sinds ' + MW.maandJaar(s.eerste));
    var perJaar = s.ritme.id === 'jaar';
    return '<li class="mw-sub' + (metLink ? '' : ' no-link') + '"><div class="mw-sub-main"><span class="mw-sub-name">' + esc(s.naam) + '</span>' +
      '<span class="mw-sub-note">' + (perJaar ? '' : euro(s.bedrag) + ' ' + s.ritme.label + (bits.length ? '. ' : '')) + bits.join('. ') + '</span></div>' +
      '<div class="mw-sub-num"><span class="mw-sub-amount">' + euro(s.perJaar, false) + '</span><span class="mw-sub-per">per jaar</span></div>' +
      (metLink ? opzegLink(s) : '') + '</li>';
  }

  /* ---------- je drie acties ---------- */

  function actie(a, nummer) {
    var metLink = !!a.opzeg;
    return '<li class="mw-action"><span class="mw-action-num" aria-hidden="true">' + nummer + '</span><div class="mw-action-body"><h3>' + esc(a.titel) + '</h3>' +
      '<p class="mw-action-why">' + esc(a.waarom) + '</p>' + (a.label ? '<p class="mw-action-save">' + esc(a.label) + '</p>' : '') +
      (a.items.length ? '<ul class="mw-action-items">' + a.items.map(function (s) { return regel(s, metLink && s.type === 'opzegbaar', false); }).join('') + '</ul>' : '') +
      '</div></li>';
  }

  function tekenActies() {
    var acties = st.res.acties, top = acties.slice(0, TOP_ACTIES), rest = acties.slice(TOP_ACTIES);
    $('acties').hidden = !acties.length;
    $('acties-kop').textContent = top.length >= 3 ? 'Je drie acties' : top.length === 2 ? 'Je twee acties' : 'Je actie';
    $('top-acties').innerHTML = top.map(function (a, i) { return actie(a, i + 1); }).join('');
    $('meer-acties').hidden = !rest.length;
    $('meer-acties').open = false;
    $('meer-acties-tekst').textContent = 'Nog ' + MW.meervoud(rest.length, 'actie', 'acties');
    $('rest-acties').innerHTML = rest.map(function (a, i) { return actie(a, i + 1 + TOP_ACTIES); }).join('');
  }

  /* ---------- je abonnementen ---------- */

  function tekenAbos() {
    var r = st.res, lijst = r.opzegbaar, top = lijst.slice(0, TOP_ABOS), rest = lijst.slice(TOP_ABOS);
    $('abonnementen').hidden = !lijst.length;
    $('abo-tekst').innerHTML = '<strong>' + MW.meervoud(lijst.length, 'abonnement', 'abonnementen') + '</strong> die je kunt opzeggen, samen <strong>' +
      euro(r.opzegbaarPerJaar, false) + ' per jaar</strong>. De duurste staan bovenaan.';
    $('abo-lijst').innerHTML = top.map(function (s) { return regel(s, true, false); }).join('');
    $('meer-abos').hidden = !rest.length;
    $('meer-abos').open = false;
    $('meer-abos-tekst').textContent = 'Toon ook de andere ' + rest.length;
    $('abo-rest').innerHTML = rest.map(function (s) { return regel(s, true, false); }).join('');
  }

  /* ---------- meer inzicht ---------- */

  var VERPLAATS = Object.keys(MW.cats).filter(function (k) { return k !== 'contant'; });

  function tekenCats() {
    var r = st.res, max = r.cats.length ? r.cats[0].totaal : 1;
    $('categorieen').innerHTML = r.cats.map(function (c) {
      var toon = c.winkels.slice(0, 12), rest = c.winkels.length - toon.length;
      return '<details class="mw-cat" data-cat="' + c.id + '"' + (st.open[c.id] ? ' open' : '') + '><summary>' +
        '<span class="mw-cat-name">' + esc(c.label) + '</span><span class="mw-cat-sum">' + euro(c.totaal, false) + '</span>' +
        '<span class="mw-cat-pct">' + (c.aandeel > 0 && c.aandeel < 0.005 ? '&lt;1' : Math.round(c.aandeel * 100)) + '%</span>' +
        '<span class="mw-track"><span style="width:' + Math.max(0.5, c.totaal / max * 100).toFixed(1) + '%"></span></span></summary>' +
        '<div class="mw-shops">' + toon.map(function (w) {
          return '<div class="mw-shop"><span class="mw-shop-name">' + esc(w.naam) + '<small>' + w.aantal + ' keer</small></span>' +
            '<span class="mw-shop-sum">' + euro(w.totaal, false) + '</span>' +
            '<select class="mw-move" data-sleutel="' + esc(w.sleutel) + '" aria-label="Verplaats ' + esc(w.naam) + ' naar een andere categorie">' +
            '<option value="">Verplaats</option>' + VERPLAATS.map(function (k) {
              return k === c.id ? '' : '<option value="' + k + '">' + esc(MW.cats[k].label) + '</option>';
            }).join('') + '</select></div>';
        }).join('') + (rest > 0 ? '<p class="mw-more">En nog ' + rest + ' kleinere.</p>' : '') + '</div></details>';
    }).join('');
  }

  function groep(titel, lijst) {
    if (!lijst.length) return '';
    var totaal = lijst.reduce(function (t, s) { return t + s.perJaar; }, 0);
    return '<div class="mw-group"><div class="mw-group-head"><h3>' + titel + '</h3><p>' + lijst.length + ' stuks, ' + euro(totaal, false) + ' per jaar</p></div>' +
      '<ul>' + lijst.map(function (s) { return regel(s, false, true); }).join('') + '</ul></div>';
  }

  function tekenVast() {
    var r = st.res;
    function van(type) { return r.vast.filter(function (s) { return s.type === type; }); }
    var aandeel = r.perMaand > 0 ? Math.round(r.vastPerMaand / r.perMaand * 100) : 0;
    $('vast-tekst').innerHTML = r.vast.length
      ? 'Elke maand ligt ' + euro(r.vastPerMaand, false) + ' vast' + (aandeel > 0 && aandeel <= 100 ? '. Dat is ' + aandeel + '% van wat je uitgeeft' : '') + '. Dit vond ik door te kijken wat steeds terugkomt.'
      : 'Ik vond geen betalingen die steeds terugkomen. Laad een langere periode, dan zie ik meer.';
    var html = groep('Kun je overstappen', van('overstappen')) + groep('Ligt vast', van('vast')) + groep('Kun je opzeggen', van('opzegbaar'));
    if (r.gestopt.length) {
      html += '<div class="mw-group"><div class="mw-group-head"><h3>Gestopt in deze periode</h3><p>' + r.gestopt.length + ' stuks</p></div><ul>' +
        r.gestopt.map(function (s) {
          return '<li class="mw-sub no-link"><div class="mw-sub-main"><span class="mw-sub-name">' + esc(s.naam) + '</span><span class="mw-sub-note">Laatste keer op ' +
            datum(s.laatste, true) + '</span></div><div class="mw-sub-num"><span class="mw-sub-amount">' + euro(s.perJaar, false) + '</span><span class="mw-sub-per">per jaar bespaard</span></div></li>';
        }).join('') + '</ul></div>';
    }
    $('vaste-lasten').innerHTML = html;
  }

  function tekenGrootste() {
    var r = st.res;
    $('grootste').innerHTML = r.grootste.map(function (t) {
      return '<li><span>' + esc(t.winkel) + '<small>' + datum(t.dag, true) + ', ' + esc(MW.cats[t.cat].label.toLowerCase()) + '</small></span><span>' + euro(t.bedrag, false) + '</span></li>';
    }).join('');
    $('groot-vak').hidden = !r.grootste.length;
  }

  function tekenAI() {
    $('ai-prompt').textContent =
      'Je bent mijn nuchtere sparringpartner voor geld. Hieronder staat een samenvatting van mijn uitgaven. De cijfers komen uit mijn eigen bankafschriften en zijn al opgeteld. Er staan geen namen van personen en geen rekeningnummers in.\n\n' +
      'WAT IK VAN JE WIL\n' +
      '1. Noem de drie dingen die je het meest opvallen.\n' +
      '2. Loop mijn vaste lasten en abonnementen na. Wat is dubbel, wat is duur voor wat het is, en waar kan ik overstappen? Zoek actuele prijzen op als je kunt zoeken.\n' +
      '3. Vraag me welke abonnementen ik wil opzeggen. Zoek per abonnement op waar en hoe ik opzeg en wat de opzegtermijn is. Schrijf een korte opzegbrief of e-mail, met een plek voor mijn naam en klantnummer.\n' +
      '4. Stel me daarna maximaal drie vragen waarmee je advies beter wordt.\n\n' +
      'Reken niets opnieuw uit en verzin geen bedragen. Weet je iets niet, zeg dat dan. Dit is geen financieel advies. Ik beslis zelf.\n\n' +
      'MIJN CIJFERS\n' + MW.samenvatting(st.res);
  }

  /* ---------- bediening ---------- */

  var drop = $('drop');
  ['dragenter', 'dragover'].forEach(function (naam) {
    drop.addEventListener(naam, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'dragend'].forEach(function (naam) {
    drop.addEventListener(naam, function () { drop.classList.remove('is-over'); });
  });
  // een bestand dat naast het vak valt, mag de pagina niet vervangen
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('is-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) laadBestanden(e.dataTransfer.files);
  });
  $('bestand').addEventListener('change', function () { laadBestanden(this.files); });
  $('voorbeeld').addEventListener('click', function () { toonVoorbeeld(true); });

  function toonVoorbeeld(scroll) {
    try { begin([MW.leesING(window.MW_DEMO.csv())], true, scroll); }
    catch (e) { fout(e.message); }
  }

  $('balk').addEventListener('click', function (e) {
    var knop = e.target.closest ? e.target.closest('button') : null;
    if (!knop) return;
    var id = knop.getAttribute('data-periode'), actieNaam = knop.getAttribute('data-actie');
    if (id) {
      st.periode = st.periodes.filter(function (p) { return p.id === id; })[0] || st.periode;
      st.res = MW.analyseer(st.data, st.periode);
      teken();
    } else if (actieNaam === 'opnieuw') opnieuw();
    else if (actieNaam === 'wis') { bewaarRegels({}); reken(); teken(); }
  });

  $('categorieen').addEventListener('toggle', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-cat');
    if (id) st.open[id] = e.target.open;
  }, true);
  $('categorieen').addEventListener('change', function (e) {
    var sel = e.target;
    if (!sel.classList || !sel.classList.contains('mw-move') || !sel.value) return;
    var regels = eigenRegels();
    regels[sel.getAttribute('data-sleutel')] = sel.value;
    bewaarRegels(regels);
    st.open[sel.value] = true;
    reken();
    teken();
  });

  // tekstballon bij de kolommen
  var tip = $('tip');
  function toonTip(el) {
    tip.innerHTML = el.getAttribute('data-tip');
    tip.hidden = false;
    var b = el.getBoundingClientRect(), balk = el.querySelector('.mw-col-bar'), top = (balk || el).getBoundingClientRect().top;
    var links = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, b.left + b.width / 2 - tip.offsetWidth / 2));
    tip.style.left = links + 'px';
    tip.style.top = Math.max(8, top - tip.offsetHeight - 10) + 'px';
  }
  function tipDoel(e) { return e.target.closest ? e.target.closest('[data-tip]') : null; }
  $('maanden').addEventListener('mouseover', function (e) { var el = tipDoel(e); if (el) toonTip(el); else tip.hidden = true; });
  $('maanden').addEventListener('mouseleave', function () { tip.hidden = true; });
  $('maanden').addEventListener('focusin', function (e) { var el = tipDoel(e); if (el) toonTip(el); });
  $('maanden').addEventListener('focusout', function () { tip.hidden = true; });
  $('maanden').addEventListener('click', function (e) { var el = tipDoel(e); if (el) toonTip(el); });
  window.addEventListener('scroll', function () { tip.hidden = true; }, { passive: true });

  // offline of vanaf je eigen computer: laat zien dat het dan ook werkt
  function toonOffline() {
    var los = window.location.protocol === 'file:', uit = window.navigator.onLine === false;
    $('offline-tekst').textContent = los ? 'Je werkt vanaf je eigen computer. Internet is niet nodig.' : 'Je bent offline. Het werkt gewoon.';
    $('offline').hidden = !(los || uit);
    $('offline-hier').hidden = !uit;
  }
  window.addEventListener('online', toonOffline);
  window.addEventListener('offline', toonOffline);
  toonOffline();

  // de link in het vak opent het tabblad met de download
  if ($('naar-download')) $('naar-download').addEventListener('click', function () {
    $('tab-download').click();
    $('uitleg').scrollIntoView({ block: 'start', behavior: STIL ? 'auto' : 'smooth' });
  });

  // het voorbeeld meteen openen: via #voorbeeld in het adres, of als de pagina erom vraagt
  if (window.MW_START_VOORBEELD || window.location.hash === '#voorbeeld') toonVoorbeeld(false);
})();
