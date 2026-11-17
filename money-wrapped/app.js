/* Money Wrapped: wat je ziet. Leest je bestand, laat de rekenkern (engine.js)
   zijn werk doen en tekent het verhaal en het overzicht. */
(function () {
  'use strict';

  var MW = window.MW;
  if (!MW || !document.getElementById('resultaat')) return;

  var STIL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var OPSLAG = 'mw-verplaatst';
  var st = { lijsten: null, voorbeeld: false, data: null, periodes: [], periode: null, res: null, vink: {}, open: {}, dia: 0, dias: 0 };

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
    Promise.all(files.map(leesBestand)).then(function (lijsten) { begin(lijsten, false); }, function (e) { fout(e.message); });
  }

  function begin(lijsten, voorbeeld) {
    try {
      st.lijsten = lijsten; st.voorbeeld = voorbeeld; st.vink = {}; st.open = {}; st.periode = null;
      reken();
    } catch (e) { fout(e.message); return; }
    $('start').hidden = true;
    $('uitleg').hidden = true;
    $('resultaat').hidden = false;
    teken(true);
    var balk = $('balk');
    if (balk.scrollIntoView) balk.scrollIntoView({ block: 'start', behavior: STIL ? 'auto' : 'smooth' });
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
    $('resultaat').hidden = true;
    $('start').hidden = false;
    $('uitleg').hidden = false;
    $('bestand').value = '';
    $('start').scrollIntoView({ block: 'center', behavior: STIL ? 'auto' : 'smooth' });
  }

  function teken(metVerhaal) {
    tekenBalk();
    if (metVerhaal) tekenVerhaal();
    tekenKort();
    tekenMaanden();
    tekenCats();
    tekenVast();
    tekenAdvies();
    tekenGrootste();
    tekenAI();
  }

  /* ---------- de balk ---------- */

  function tekenBalk() {
    var r = st.res, d = st.data, html = '';
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
    void r;
  }

  /* ---------- het verhaal ---------- */

  var STREEP = '<svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M4 15 C 60 7, 140 6, 200 9 S 280 14, 296 8"/></svg>';
  function streep(tekst) { return '<span class="u">' + esc(tekst) + STREEP + '</span>'; }
  function teller(waarde, soort) {
    return '<span data-tel="' + waarde + '" data-soort="' + soort + '">' + (soort === 'euro' ? euro(waarde, false) : MW.getal(waarde)) + '</span>';
  }
  function rang(lijst, max) {
    return '<ol class="mw-rank">' + lijst.map(function (x) {
      return '<li><span class="mw-rank-name">' + esc(x[0]) + '</span><span class="mw-rank-val">' + esc(x[1]) + '</span>' +
        '<span class="mw-rank-track" style="width:' + Math.max(3, Math.round(x[2] / max * 100)) + '%"></span></li>';
    }).join('') + '</ol>';
  }

  function tekenVerhaal() {
    var r = st.res, P = r.periode, dias = [];
    var titel = P.jaar ? 'Jouw ' + P.jaar : P.id === '12m' ? 'Jouw laatste twaalf maanden' : 'Jouw geld';

    dias.push('<p class="mw-kicker">Money Wrapped</p><p class="mw-big mw-word">' + esc(titel) + ' in ' + streep('geld.') + '</p>' +
      '<p class="mw-line">' + MW.getal(r.aantal) + ' af- en bijschrijvingen. Eén verhaal.</p>');

    dias.push('<p class="mw-kicker">Er ging uit</p><p class="mw-big">' + teller(Math.round(r.uit), 'euro') + '</p>' +
      '<p class="mw-line">Dat is ' + euro(r.perDag, false) + ' per dag.</p>' +
      '<p class="mw-sub">Er kwam ' + euro(r.binnen, false) + ' binnen.</p>');

    if (r.cats.length) {
      var top = r.cats.slice(0, 5);
      dias.push('<p class="mw-kicker">Het meeste ging naar</p><p class="mw-big mw-word">' + streep(top[0].label) + '</p>' +
        rang(top.map(function (c) { return [c.label, euro(c.totaal, false), c.totaal]; }), top[0].totaal));
    }

    if (r.bezoek.length) {
      var b = r.bezoek.slice(0, 5);
      dias.push('<p class="mw-kicker">Hier kwam je het vaakst</p><p class="mw-big mw-word">' + streep(b[0].naam) + '</p>' +
        '<p class="mw-line">' + b[0].aantal + ' keer. Samen ' + euro(b[0].totaal, false) + '.</p>' +
        rang(b.slice(1).map(function (w) { return [w.naam, w.aantal + ' keer', w.aantal]; }), b[0].aantal));
    }

    if (r.maanden.length >= 3 && r.duursteMaand) {
      var maxM = Math.max.apply(null, r.maanden.map(function (m) { return m.uit; })) || 1;
      var toon = r.maanden.slice(-14);
      dias.push('<p class="mw-kicker">Je duurste maand</p><p class="mw-big mw-word">' + streep(hoofdletter(r.duursteMaand.naam)) + '</p>' +
        '<p class="mw-line">' + euro(r.duursteMaand.uit, false) + '. Je rustigste maand was ' + r.rustigsteMaand.naam + '.</p>' +
        '<div><div class="mw-mini">' + toon.map(function (m) {
          return '<span' + (m === r.duursteMaand ? ' class="is-top"' : '') + ' style="height:' + Math.max(2, Math.round(m.uit / maxM * 100)) + '%"></span>';
        }).join('') + '</div><div class="mw-mini-labels">' + toon.map(function (m) { return '<span>' + m.kort.charAt(0) + '</span>'; }).join('') + '</div></div>');
    }

    if (r.vast.length) {
      dias.push('<p class="mw-kicker">Vaste lasten en abonnementen</p><p class="mw-big">' + teller(r.vast.length, 'getal') + '</p>' +
        '<p class="mw-line">Samen ' + euro(r.vastPerMaand, false) + ' per maand.</p>' +
        '<p class="mw-sub">Dat is weg voordat je iets hebt gedaan.</p>');
    }

    var bez = r.cat('bezorgen'), hor = r.cat('horeca');
    if (bez.aantal >= 6) {
      dias.push('<p class="mw-kicker">Eten laten bezorgen</p><p class="mw-big">' + teller(bez.aantal, 'getal') + ' keer</p>' +
        '<p class="mw-line">Samen ' + euro(bez.totaal, false) + '. Gemiddeld ' + euro(bez.totaal / bez.aantal, false) + ' per keer.</p>');
    } else if (hor.aantal >= 10) {
      dias.push('<p class="mw-kicker">Uit eten en drinken</p><p class="mw-big">' + teller(hor.aantal, 'getal') + ' keer</p>' +
        '<p class="mw-line">Samen ' + euro(hor.totaal, false) + '. Gemiddeld ' + euro(hor.totaal / hor.aantal, false) + ' per keer.</p>');
    }

    dias.push('<p class="mw-kicker">Jouw geldtype</p><p class="mw-big mw-word">' + streep(r.type.naam) + '</p>' +
      '<p class="mw-line">' + esc(r.type.tekst) + '</p>');

    if (r.opzegbaar.length) {
      dias.push('<p class="mw-kicker">Wat je kunt opzeggen</p><p class="mw-big">' + teller(Math.round(r.opzegbaarPerJaar), 'euro') + '</p>' +
        '<p class="mw-line">Dat kosten je ' + r.opzegbaar.length + ' abonnementen samen per jaar.</p>' +
        '<p class="mw-sub">Kies hieronder wat weg mag.</p>');
    } else {
      dias.push('<p class="mw-kicker">En nu</p><p class="mw-big mw-word">Het hele ' + streep('overzicht.') + '</p>' +
        '<p class="mw-line">Je vaste lasten, je categorieën en je advies staan hieronder.</p>');
    }

    $('dias').innerHTML = dias.map(function (h, i) { return '<div class="mw-slide" data-dia="' + i + '" aria-hidden="true">' + h + '</div>'; }).join('');
    $('voortgang').innerHTML = dias.map(function () { return '<span></span>'; }).join('');
    st.dias = dias.length;
    toonDia(0);
  }

  function toonDia(i) {
    i = Math.max(0, Math.min(st.dias - 1, i));
    st.dia = i;
    Array.prototype.forEach.call($('dias').children, function (el, k) {
      el.classList.toggle('is-on', k === i);
      el.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      if (k === i) Array.prototype.forEach.call(el.querySelectorAll('[data-tel]'), telOp);
    });
    Array.prototype.forEach.call($('voortgang').children, function (el, k) { el.classList.toggle('is-done', k <= i); });
    $('terug').disabled = i === 0;
    $('verder').textContent = i === st.dias - 1 ? 'Naar het overzicht' : i === 0 ? 'Begin' : 'Verder';
  }

  function telOp(el) {
    var doel = +el.getAttribute('data-tel'), soort = el.getAttribute('data-soort');
    function zet(x) { el.textContent = soort === 'euro' ? euro(x, false) : MW.getal(x); }
    if (STIL || !window.requestAnimationFrame) { zet(doel); return; }
    var start = 0, duur = 900;
    zet(0);
    window.requestAnimationFrame(function stap(nu) {
      if (!start) start = nu;
      var p = Math.min(1, (nu - start) / duur), e = 1 - Math.pow(1 - p, 3);
      zet(Math.round(doel * e));
      if (p < 1 && el.isConnected) window.requestAnimationFrame(stap);
    });
  }

  function verder() {
    if (st.dia >= st.dias - 1) { $('kort').scrollIntoView({ block: 'start', behavior: STIL ? 'auto' : 'smooth' }); return; }
    toonDia(st.dia + 1);
  }

  /* ---------- in het kort ---------- */

  function tekenKort() {
    var r = st.res, sal = r.inkomen.filter(function (c) { return c.id === 'salaris'; })[0];
    function tegel(label, waarde, sub) {
      return '<div class="mw-tile"><span class="caps">' + label + '</span><span class="mw-tile-value">' + waarde + '</span><span class="mw-tile-sub">' + sub + '</span></div>';
    }
    $('tegels').innerHTML =
      tegel('Uitgegeven', euro(r.uit, false), euro(r.perMaand, false) + ' per maand') +
      tegel('Binnengekomen', euro(r.binnen, false), sal ? 'waarvan ' + euro(sal.totaal, false) + ' salaris' : MW.meervoud(r.inkomen.length, 'bron', 'bronnen')) +
      tegel(r.over >= 0 ? 'Over' : 'Tekort', euro(Math.abs(r.over), false),
        r.sparen > 0 ? euro(r.sparen, false) + ' ging naar sparen' : r.sparen < 0 ? euro(-r.sparen, false) + ' kwam van je spaargeld' : r.binnen > 0 ? Math.round(r.over / r.binnen * 100) + '% van wat binnenkwam' : '') +
      tegel('Vast per maand', euro(r.vastPerMaand, false), MW.meervoud(r.vast.length, 'vaste last', 'vaste lasten'));
  }

  /* ---------- per maand ---------- */

  function mooiMax(x) {
    var stap = Math.pow(10, Math.floor(Math.log(x) / Math.LN10)), opties = [1, 2, 2.5, 4, 5, 10];
    for (var i = 0; i < opties.length; i++) if (opties[i] * stap >= x) return opties[i] * stap;
    return 10 * stap;
  }

  function tekenMaanden() {
    var r = st.res, ms = r.maanden, max = mooiMax(Math.max.apply(null, ms.map(function (m) { return m.uit; }).concat([1])));
    var heel = ms.filter(function (m) { return m.heel; }), gem = heel.length ? heel.reduce(function (t, m) { return t + m.uit; }, 0) / heel.length : r.perMaand;
    var meerJaar = ms.length && ms[0].jaar !== ms[ms.length - 1].jaar;
    var html = '<div class="mw-plot">';
    [0, 0.5, 1].forEach(function (f) {
      html += '<div class="mw-gridline' + (f === 0 ? ' is-base' : '') + '" style="bottom:' + f * 100 + '%"><span>' + euro(max * f, false) + '</span></div>';
    });
    html += '<div class="mw-cols">' + ms.map(function (m) {
      var h = Math.max(0, m.uit / max * 100), top = m === r.duursteMaand;
      return '<button class="mw-col' + (top ? ' is-top' : '') + (m.heel ? '' : ' is-part') + '" type="button" data-tip="<b>' + esc(hoofdletter(m.naam) + ' ' + m.jaar) + '</b>' +
        esc(euro(m.uit, false) + ' uit, ' + euro(m.binnen, false) + ' binnen' + (m.heel ? '' : '. Deze maand is niet compleet.')) + '" aria-label="' +
        esc(m.naam + ' ' + m.jaar + ': ' + euro(m.uit, false) + ' uit') + '"><span class="mw-col-bar" style="height:' + h.toFixed(1) + '%"></span>' +
        (top ? '<span class="mw-col-val" style="bottom:' + h.toFixed(1) + '%">' + euro(m.uit, false) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    if (heel.length >= 3) html += '<div class="mw-avg" style="bottom:' + (gem / max * 100).toFixed(1) + '%"><span>gemiddeld ' + euro(gem, false) + '</span></div>';
    html += '</div><div class="mw-xlabels' + (ms.length > 13 ? ' is-dense' : '') + '">' + ms.map(function (m) {
      return '<span>' + m.kort + (meerJaar && m.maand === 1 ? ' ’' + String(m.jaar).slice(2) : '') + '</span>';
    }).join('') + '</div>';
    var deel = ms.filter(function (m) { return !m.heel; });
    if (deel.length) html += '<p class="mw-chart-note">Lichte kolommen zijn maanden die niet compleet zijn.</p>';
    $('maanden').innerHTML = html;
    $('maand-tekst').innerHTML = r.duursteMaand && ms.length >= 3
      ? 'Je gaf gemiddeld <strong>' + euro(gem, false) + '</strong> per maand uit. ' + hoofdletter(r.duursteMaand.naam) + ' was het duurst, ' + r.rustigsteMaand.naam + ' het rustigst.'
      : 'Wat er per maand uitging.';
  }

  /* ---------- categorieën ---------- */

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

  /* ---------- vaste lasten ---------- */

  function rij(s, vinkbaar) {
    var r = st.res, bits = [esc(MW.cats[s.cat].label)];
    if (s.stijging) bits.push('<b>Duurder geworden.</b> Was ' + euro(s.stijging.van));
    if (s.onzeker) bits.push('Eén keer gezien, waarschijnlijk per jaar');
    if (s.ritme.id === 'jaar' && s.volgende >= r.eind - 7 && s.volgende <= r.eind + 100) bits.push('<b>Verlengt rond ' + datum(s.volgende) + '</b>');
    else if (s.eerste > st.data.begin + 40 && s.eerste >= r.periode.van) bits.push('Nieuw sinds ' + MW.maandJaar(s.eerste));
    var aan = !!st.vink[s.sleutel];
    return '<li class="mw-row' + (vinkbaar ? '' : ' no-check') + (aan ? ' is-picked' : '') + '">' +
      (vinkbaar ? '<label class="mw-check"><input type="checkbox" data-vink="' + esc(s.sleutel) + '"' + (aan ? ' checked' : '') +
        ' aria-label="Zet ' + esc(s.naam) + ' op mijn opzeglijst"><span></span></label>' : '') +
      '<div class="mw-row-main"><span class="mw-row-name">' + esc(s.naam) + '</span><span class="mw-row-note">' + bits.join('. ') + '.</span></div>' +
      '<div class="mw-row-num"><span class="mw-row-amount">' + euro(s.bedrag) + '</span><span class="mw-row-year"><span>' + s.ritme.label + '</span>' +
      (s.ritme.id === 'jaar' ? '' : '<span>' + euro(s.perJaar, false) + ' per jaar</span>') + '</span></div></li>';
  }

  function groep(titel, lede, lijst, vinkbaar) {
    if (!lijst.length) return '';
    var totaal = lijst.reduce(function (t, s) { return t + s.perJaar; }, 0);
    return '<div class="mw-group"><div class="mw-group-head"><h3>' + titel + '</h3><p>' + lijst.length + ' stuks, ' + euro(totaal, false) + ' per jaar</p></div>' +
      '<p class="mw-group-lede">' + lede + '</p><ul>' + lijst.map(function (s) { return rij(s, vinkbaar); }).join('') + '</ul></div>';
  }

  function tekenVast() {
    var r = st.res;
    function van(type) { return r.vast.filter(function (s) { return s.type === type; }); }
    var aandeel = r.perMaand > 0 ? Math.round(r.vastPerMaand / r.perMaand * 100) : 0;
    $('vast-tekst').innerHTML = r.vast.length
      ? 'Elke maand ligt <strong>' + euro(r.vastPerMaand, false) + '</strong> vast' + (aandeel > 0 && aandeel <= 100 ? '. Dat is ' + aandeel + '% van wat je uitgeeft' : '') + '. Dit vond ik door te kijken wat steeds terugkomt.'
      : 'Ik vond geen betalingen die steeds terugkomen. Laad een langere periode, dan zie ik meer.';
    $('opzegbaar').innerHTML = groep('Kun je opzeggen', 'Vink aan wat weg mag. Onderaan zie je wat het oplevert.', van('opzegbaar'), true);
    var html = groep('Kun je overstappen', 'Hier heb je iets nodig, maar niet per se deze aanbieder.', van('overstappen'), false) +
      groep('Ligt vast', 'Hier kom je niet zomaar vanaf.', van('vast'), false);
    if (r.gestopt.length) {
      html += '<div class="mw-group"><div class="mw-group-head"><h3>Gestopt in deze periode</h3><p>' + r.gestopt.length + ' stuks</p></div><ul>' +
        r.gestopt.map(function (s) {
          return '<li class="mw-row no-check"><div class="mw-row-main"><span class="mw-row-name">' + esc(s.naam) + '</span><span class="mw-row-note">Laatste keer op ' +
            datum(s.laatste, true) + '.</span></div><div class="mw-row-num"><span class="mw-row-amount">' + euro(s.bedrag) + '</span><span class="mw-row-year">' + s.ritme.label + '</span></div></li>';
        }).join('') + '</ul></div>';
    }
    $('vaste-lasten').innerHTML = html;
    $('opzeg-totaal').hidden = !r.opzegbaar.length;
    tekenOpzeg();
  }

  function tekenOpzeg() {
    var r = st.res, gekozen = r.opzegbaar.filter(function (s) { return st.vink[s.sleutel]; });
    var totaal = gekozen.reduce(function (t, s) { return t + s.perJaar; }, 0);
    $('opzeg-tekst').innerHTML = gekozen.length
      ? MW.meervoud(gekozen.length, 'abonnement', 'abonnementen') + ' op je opzeglijst. Dat scheelt <b>' + euro(totaal, false) + ' per jaar</b>.'
      : 'Vink hierboven aan wat weg mag. Samen kosten deze abonnementen <b>' + euro(r.opzegbaarPerJaar, false) + ' per jaar</b>.';
    var lijst = gekozen.length ? gekozen : r.opzegbaar;
    $('opzeg-prompt').textContent =
      'Help me deze abonnementen op te zeggen.\n\n' +
      'Geef per abonnement:\n' +
      '1. Hoe ik opzeg: de route in de app of op de website, of het adres voor een brief. Zoek het op als je kunt zoeken.\n' +
      '2. De opzegtermijn en of er een jaarcontract kan lopen.\n' +
      '3. Een korte opzegbrief of e-mail die ik zo kan versturen. Laat een plek open voor mijn naam en klantnummer.\n\n' +
      'Weet je iets niet zeker, zeg dat erbij. Begin met het abonnement dat het meeste oplevert.\n\n' +
      'MIJN OPZEGLIJST\n' + lijst.map(function (s) {
        return '- ' + s.naam + ': ' + euro(s.bedrag) + ' ' + s.ritme.label + (s.ritme.id === 'jaar' ? ', verlengt rond ' + datum(s.volgende) : '');
      }).join('\n');
  }

  /* ---------- advies, grootste uitgaven, AI ---------- */

  function tekenAdvies() {
    var r = st.res;
    $('advies').hidden = !r.advies.length;
    $('adviezen').innerHTML = r.advies.map(function (a, i) {
      return '<li class="mw-adv' + (a.soort === 'inzicht' ? ' is-info' : '') + '"><span class="mw-adv-num" aria-hidden="true">' + (i + 1) + '</span><div class="mw-adv-body"><h3>' +
        esc(a.titel) + '</h3><p>' + esc(a.tekst) + '</p>' + (a.bespaar >= 1 ? '<span class="mw-adv-save">Scheelt tot ' + euro(a.bespaar, false) + ' per jaar</span>' : '') + '</div></li>';
    }).join('');
  }

  function tekenGrootste() {
    var r = st.res;
    $('grootste').innerHTML = r.grootste.map(function (t) {
      return '<li><span>' + esc(t.winkel) + '<small>' + datum(t.dag, true) + ', ' + esc(MW.cats[t.cat].label.toLowerCase()) + '</small></span><span>' + euro(t.bedrag, false) + '</span></li>';
    }).join('');
    $('grootste').parentNode.hidden = !r.grootste.length;
  }

  function tekenAI() {
    $('ai-prompt').textContent =
      'Je bent mijn nuchtere sparringpartner voor geld. Hieronder staat een samenvatting van mijn uitgaven. De cijfers komen uit mijn eigen bankafschriften en zijn al opgeteld. Er staan geen namen van personen en geen rekeningnummers in.\n\n' +
      'WAT IK VAN JE WIL\n' +
      '1. Noem de drie dingen die je het meest opvallen.\n' +
      '2. Loop mijn vaste lasten en abonnementen na. Wat is dubbel, wat is duur voor wat het is, en waar kan ik overstappen? Zoek actuele prijzen op als je kunt zoeken.\n' +
      '3. Maak een lijst met wat ik deze week kan opzeggen of veranderen, met per punt wat het per jaar oplevert.\n' +
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
  $('voorbeeld').addEventListener('click', toonVoorbeeld);

  function toonVoorbeeld() { begin([MW.leesING(window.MW_DEMO.csv())], true); }

  $('balk').addEventListener('click', function (e) {
    var knop = e.target.closest ? e.target.closest('button') : null;
    if (!knop) return;
    var id = knop.getAttribute('data-periode'), actie = knop.getAttribute('data-actie');
    if (id) {
      st.periode = st.periodes.filter(function (p) { return p.id === id; })[0] || st.periode;
      st.res = MW.analyseer(st.data, st.periode);
      st.vink = {};
      teken(true);
    } else if (actie === 'opnieuw') opnieuw();
    else if (actie === 'wis') { bewaarRegels({}); reken(); teken(false); }
  });

  $('verder').addEventListener('click', verder);
  $('tik-verder').addEventListener('click', verder);
  $('terug').addEventListener('click', function () { toonDia(st.dia - 1); });
  $('tik-terug').addEventListener('click', function () { toonDia(st.dia - 1); });
  $('telefoon').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); if (st.dia < st.dias - 1) toonDia(st.dia + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); toonDia(st.dia - 1); }
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
    teken(false);
  });

  $('opzegbaar').addEventListener('change', function (e) {
    var sleutel = e.target.getAttribute && e.target.getAttribute('data-vink');
    if (!sleutel) return;
    st.vink[sleutel] = e.target.checked;
    var li = e.target.closest ? e.target.closest('.mw-row') : null;
    if (li) li.classList.toggle('is-picked', e.target.checked);
    tekenOpzeg();
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

  // offline: laat zien dat het dan ook werkt
  function toonOffline() {
    var los = window.location.protocol === 'file:', uit = window.navigator.onLine === false;
    $('offline-tekst').textContent = los ? 'Je werkt vanaf je eigen computer. Internet is niet nodig.' : 'Je bent offline. Het werkt gewoon.';
    $('offline').hidden = !(los || uit);
    $('offline-hier').hidden = !uit;
  }
  // de link in het vak opent het tabblad met de download
  if ($('naar-download')) $('naar-download').addEventListener('click', function () {
    $('tab-download').click();
    $('uitleg').scrollIntoView({ block: 'start', behavior: STIL ? 'auto' : 'smooth' });
  });
  window.addEventListener('online', toonOffline);
  window.addEventListener('offline', toonOffline);
  toonOffline();

  // het voorbeeld meteen openen: via #voorbeeld in het adres, of als de pagina erom vraagt
  if (window.MW_START_VOORBEELD || window.location.hash === '#voorbeeld') {
    try { st.lijsten = [MW.leesING(window.MW_DEMO.csv())]; st.voorbeeld = true; reken(); $('start').hidden = true; $('uitleg').hidden = true; $('resultaat').hidden = false; teken(true); }
    catch (e) { fout(e.message); }
  }
})();
