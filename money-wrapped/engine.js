/* Money Wrapped: de rekenkern. Leest een export van de bank, herkent winkels,
   categorieën en vaste lasten, en maakt het overzicht en het advies.
   Alles gebeurt hier, in de browser. Er wordt niets verstuurd. */
(function (root) {
  'use strict';

  var R = root.MW_REGELS;
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var WEEKDAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

  /* ---------- hulpjes ---------- */

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function dagVan(j, m, d) { return Math.round(Date.UTC(j, m - 1, d) / 864e5); }
  function datumVan(dag) { return new Date(dag * 864e5); }
  function mediaan(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; }), h = s.length >> 1;
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  }
  function som(a, f) { var t = 0; for (var i = 0; i < a.length; i++) t += f ? f(a[i]) : a[i]; return t; }
  function rond(x) { return Math.round(x * 100) / 100; }

  var EURO0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var EURO2 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
  function euro(x, centen) {
    var s = (centen || (Math.abs(x) < 100 && Math.round(x) !== x && centen !== false)) ? EURO2.format(x) : EURO0.format(x);
    return s;
  }
  function getal(x) { return new Intl.NumberFormat('nl-NL').format(x); }
  function datum(dag, metJaar) {
    var d = datumVan(dag);
    return d.getUTCDate() + ' ' + MAANDEN[d.getUTCMonth()] + (metJaar ? ' ' + d.getUTCFullYear() : '');
  }
  function maandJaar(dag) { var d = datumVan(dag); return MAANDEN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function meervoud(n, een, meer) { return n + ' ' + (n === 1 ? een : meer); }

  /* ---------- regels klaarzetten ---------- */

  var MERK = [], ALGEMEEN = [];
  R.volgorde.forEach(function (cat) {
    (R.regels[cat] || []).forEach(function (regel) {
      var i = regel.indexOf('='), label = regel.slice(0, i), rest = regel.slice(i + 1), vlag = {};
      var j = rest.lastIndexOf('!');
      if (j > -1) { rest.slice(j + 1).split(',').forEach(function (f) { vlag[f] = 1; }); rest = rest.slice(0, j); }
      var soort = Object.keys(vlag).filter(function (f) { return f !== 'abo' && f !== 'n' && f !== 'vast'; })[0] || '';
      var r = {
        re: new RegExp('\\b(?:' + rest + ')\\b'), label: label, cat: cat, soort: soort, alleenNaam: !!vlag.n,
        abo: !vlag.vast && (!!vlag.abo || (!!R.cats[cat].abo && !!label))
      };
      (label ? MERK : ALGEMEEN).push(r);
    });
  });
  var INKOMEN_RE = R.inkomenRegels.map(function (r) { return [r[0], new RegExp('\\b(?:' + r[1] + ')\\b')]; });

  // betaaldiensten die voor de echte naam staan
  var VOORVOEGSEL = /^(?:ccv|sumup|zettle|iz|sq|bck|pay nl|mollie|adyen|paypal|tmc|ems|payco|msp|ppro|stripe|bs|lsp|wpy|twint)\s+(?=\S)/;
  var BEDRIJF = /\b(?:b v|bv|n v|nv|vof|v o f|stichting|holding|gmbh|ltd|inc|vereniging|praktijk|bedrijf|service|services|shop|store|winkel|groep|group|nederland|international|beheer|advies|consultancy|studio|company|sarl|llc|limited|plc|maatschap|firma|bank|online|com|nl)\b/;

  var cache = {};
  function zoekRegel(tekst, inMemo) {
    var k = (inMemo ? 'm|' : 'n|') + tekst;
    if (k in cache) return cache[k];
    var gevonden = null, i;
    for (i = 0; i < MERK.length && !gevonden; i++) if (!(inMemo && MERK[i].alleenNaam) && MERK[i].re.test(tekst)) gevonden = MERK[i];
    for (i = 0; i < ALGEMEEN.length && !gevonden; i++) if (ALGEMEEN[i].re.test(tekst)) gevonden = ALGEMEEN[i];
    return (cache[k] = gevonden);
  }

  var VELD_EINDE = '(?=\\s+(?:Naam|Omschrijving|IBAN|Kenmerk|Machtiging ID|Incassant ID|Valutadatum|Datum/Tijd|Pasvolgnr|Transactie|Term|Name|Description|Reference|Mandate ID|Creditor ID|Value date):|\\s+(?:Doorlopende|Eenmalige) incasso|\\s+(?:Recurrent|One-off) SEPA|$)';
  var VELD_NAAM = new RegExp('(?:Naam|Name):\\s*(.*?)' + VELD_EINDE);
  var VELD_OMS = new RegExp('(?:Omschrijving|Description):\\s*(.*?)' + VELD_EINDE);

  function netteNaam(ruw) {
    var s = (ruw || '').replace(/\s+/g, ' ').trim();
    s = s.replace(/^(?:CCV|SUMUP|ZETTLE_|IZ|SQ|BCK|PAY\.NL|MOLLIE|ADYEN|PAYPAL|TMC|EMS|PAYCO|MSP|PPRO|STRIPE|BS|LSP|WPY)\s*\*\s*/i, '');
    s = s.replace(/\s+(?:NLD|NL|BEL|DEU|GBR|IRL|LUX|USA|FRA|ESP|ITA|SWE|DNK|PRT|AUT|CHE)$/i, '');
    s = s.replace(/\b\d{3,}\b/g, ' ').replace(/\s+(?:b\.?v\.?|n\.?v\.?)(?=\s|$)/ig, ' ').replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (s && s === s.toUpperCase()) {
      s = s.toLowerCase().replace(/(^|[\s\-'&.\/])([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); });
    } else {
      s = s.replace(/\b[A-Z]{4,}\b/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); });
    }
    return s || 'Onbekend';
  }

  /* ---------- het bestand lezen ---------- */

  function leesCSV(tekst) {
    tekst = tekst.replace(/^﻿/, '');
    var eerste = tekst.slice(0, tekst.indexOf('\n') > -1 ? tekst.indexOf('\n') : tekst.length);
    var scheiding = (eerste.split(';').length >= eerste.split(',').length) ? ';' : ',';
    var rijen = [], rij = [], veld = '', inQ = false, i = 0, n = tekst.length, c;
    while (i < n) {
      c = tekst[i];
      if (inQ) {
        if (c === '"') { if (tekst[i + 1] === '"') { veld += '"'; i++; } else inQ = false; }
        else veld += c;
      } else if (c === '"') inQ = true;
      else if (c === scheiding) { rij.push(veld); veld = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && tekst[i + 1] === '\n') i++;
        rij.push(veld); veld = '';
        if (rij.length > 1 || rij[0] !== '') rijen.push(rij);
        rij = [];
      } else veld += c;
      i++;
    }
    if (veld !== '' || rij.length) { rij.push(veld); rijen.push(rij); }
    return rijen;
  }

  var KOLOMMEN = {
    datum: ['datum', 'date'],
    naam: ['naam / omschrijving', 'naam/omschrijving', 'name / description'],
    rekening: ['rekening', 'account'],
    tegen: ['tegenrekening', 'counterparty'],
    code: ['code'],
    afbij: ['af bij', 'af/bij', 'debit/credit'],
    bedrag: ['bedrag (eur)', 'amount (eur)', 'bedrag'],
    soort: ['mutatiesoort', 'transaction type'],
    memo: ['mededelingen', 'notifications'],
    saldo: ['saldo na mutatie', 'resulting balance']
  };

  function leesBedrag(s) {
    s = (s || '').trim().replace(/\s|€/g, '');
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var x = parseFloat(s);
    return isFinite(x) ? x : NaN;
  }
  function leesDatum(s) {
    s = (s || '').trim();
    var m;
    if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return [+m[1], +m[2], +m[3]];
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return [+m[1], +m[2], +m[3]];
    if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/.exec(s))) return [+m[3], +m[2], +m[1]];
    return null;
  }

  // één ING-bestand naar een lijst af- en bijschrijvingen
  function leesING(tekst) {
    var rijen = leesCSV(tekst);
    if (rijen.length < 2) throw new Error('Dit bestand is leeg.');
    var kop = rijen[0].map(function (k) { return k.trim().toLowerCase(); }), col = {};
    Object.keys(KOLOMMEN).forEach(function (k) {
      col[k] = -1;
      KOLOMMEN[k].forEach(function (naam) { if (col[k] < 0) col[k] = kop.indexOf(naam); });
    });
    if (col.datum < 0 || col.naam < 0 || col.afbij < 0 || col.bedrag < 0) {
      throw new Error('Dit lijkt geen export van ING. Kies bij het downloaden voor het formaat CSV.');
    }
    var uit = [];
    for (var i = 1; i < rijen.length; i++) {
      var r = rijen[i], d = leesDatum(r[col.datum]), b = leesBedrag(r[col.bedrag]);
      if (!d || isNaN(b)) continue;
      var richting = (r[col.afbij] || '').trim().toLowerCase();
      uit.push({
        dag: dagVan(d[0], d[1], d[2]), jaar: d[0], maand: d[1],
        naam: (r[col.naam] || '').trim(),
        rekening: col.rekening > -1 ? (r[col.rekening] || '').replace(/\s/g, '') : '',
        tegen: col.tegen > -1 ? (r[col.tegen] || '').replace(/\s/g, '') : '',
        code: col.code > -1 ? (r[col.code] || '').trim().toUpperCase() : '',
        af: richting === 'af' || richting === 'debit',
        bedrag: Math.abs(b),
        soort: col.soort > -1 ? (r[col.soort] || '').trim() : '',
        memo: col.memo > -1 ? (r[col.memo] || '').replace(/\s+/g, ' ').trim() : ''
      });
    }
    if (!uit.length) throw new Error('Ik vind geen af- en bijschrijvingen in dit bestand.');
    return uit;
  }

  // meerdere bestanden samenvoegen; wat in twee bestanden staat telt één keer
  function voegSamen(lijsten) {
    var max = {}, alles = [];
    lijsten.forEach(function (lijst) {
      var tel = {};
      lijst.forEach(function (t) {
        var k = [t.dag, t.rekening, t.af ? 'a' : 'b', t.bedrag, t.naam, t.memo].join('|');
        tel[k] = (tel[k] || 0) + 1;
        if (tel[k] > (max[k] || 0)) { max[k] = tel[k]; alles.push(t); }
      });
    });
    alles.sort(function (a, b) { return a.dag - b.dag; });
    return alles;
  }

  /* ---------- herkennen: winkel, categorie, soort geldstroom ---------- */

  function herken(txs, eigenRegels) {
    eigenRegels = eigenRegels || {};
    var eigen = {};
    txs.forEach(function (t) { if (t.rekening) eigen[t.rekening] = 1; });

    txs.forEach(function (t) {
      var nNaam = norm(t.naam).replace(VOORVOEGSEL, '');
      var mNaam = VELD_NAAM.exec(t.memo), mOms = VELD_OMS.exec(t.memo);
      var oms = mOms ? norm(mOms[1]) : (t.code === 'BA' || t.code === 'GM' ? '' : norm(t.memo));
      var regel = zoekRegel(nNaam, false) || (mNaam && zoekRegel(norm(mNaam[1]).replace(VOORVOEGSEL, ''), false)) || (oms && zoekRegel(oms, true)) || null;

      t.winkel = regel && regel.label ? regel.label : netteNaam(t.naam);
      t.sleutel = regel && regel.label ? 'r:' + regel.label.toLowerCase() : 'n:' + norm(t.winkel);
      t.regel = regel;
      t.incasso = t.code === 'IC' || /incasso/i.test(t.soort);
      t.doorlopend = /doorlopende incasso|recurrent sepa/i.test(t.memo);

      var tikkie = /\btikkie\b|betaalverzoek/.test(nNaam + ' ' + oms);
      var overboeking = /^(?:GT|OV|IDB|VZ)$/.test(t.code) || /online bankieren|overschrijving/i.test(t.soort);
      var persoon = tikkie || (overboeking && !BEDRIJF.test(nNaam));
      var cat, stroom;

      if (t.tegen && eigen[t.tegen]) { cat = 'eigen'; stroom = 'intern'; }
      else if (t.af) {
        cat = regel ? regel.cat : (t.code === 'GM' || /geldautomaat/i.test(t.soort)) ? 'contant' : persoon ? 'personen' : 'overig';
        stroom = 'uit';
      } else {
        var ink = null;
        for (var i = 0; i < INKOMEN_RE.length && !ink; i++) if (INKOMEN_RE[i][1].test(nNaam + ' ' + oms)) ink = INKOMEN_RE[i][0];
        if (regel && R.cats[regel.cat].buiten) { cat = regel.cat; stroom = 'uit'; }
        else if (ink) { cat = ink; stroom = 'in'; }
        else if (regel) { cat = regel.cat; stroom = 'terug'; }
        else if (persoon) { cat = 'terugbetaald'; stroom = 'in'; }
        else { cat = 'inkomen_overig'; stroom = 'in'; }
      }

      // wat je zelf hebt verplaatst, wint
      var eigenCat = eigenRegels[t.sleutel];
      if (eigenCat && R.cats[eigenCat] && stroom !== 'intern' && stroom !== 'in') { cat = eigenCat; t.verplaatst = true; }
      else if (eigenCat && R.cats[eigenCat] && R.cats[eigenCat].buiten && stroom === 'in') { cat = eigenCat; t.verplaatst = true; }

      if (R.cats[cat] && R.cats[cat].buiten) stroom = cat === 'eigen' ? 'intern' : 'sparen';
      else if (stroom === 'sparen' || (stroom === 'intern' && cat !== 'eigen')) stroom = t.af ? 'uit' : 'terug';
      t.cat = cat;
      t.stroom = stroom;
    });
    return txs;
  }

  /* ---------- vaste lasten en abonnementen vinden ---------- */

  var RITMES = [
    { id: 'week', dagen: 7, marge: 1.5, perJaar: 52, label: 'per week' },
    { id: 'tweeweken', dagen: 14, marge: 2.5, perJaar: 26, label: 'per twee weken' },
    { id: 'vierweken', dagen: 28, marge: 1.6, perJaar: 13, label: 'per vier weken' },
    { id: 'maand', dagen: 30.44, marge: 4.6, perJaar: 12, label: 'per maand' },
    { id: 'tweemaanden', dagen: 60.9, marge: 8, perJaar: 6, label: 'per twee maanden' },
    { id: 'kwartaal', dagen: 91.3, marge: 11, perJaar: 4, label: 'per kwartaal' },
    { id: 'halfjaar', dagen: 182.6, marge: 16, perJaar: 2, label: 'per halfjaar' },
    { id: 'jaar', dagen: 365.25, marge: 26, perJaar: 1, label: 'per jaar' }
  ];
  var JAAR = RITMES[7];

  function vindRitme(lijst) {
    if (lijst.length < 2) return null;
    var tussen = [];
    for (var i = 1; i < lijst.length; i++) tussen.push(lijst[i].dag - lijst[i - 1].dag);
    var med = mediaan(tussen), beste = null;
    RITMES.forEach(function (r) {
      var d = Math.abs(med - r.dagen);
      if (d <= r.marge && (!beste || d < Math.abs(med - beste.dagen))) beste = r;
    });
    if (!beste) return null;
    var goed = tussen.filter(function (t) {
      return Math.abs(t - beste.dagen) <= beste.marge || Math.abs(t - 2 * beste.dagen) <= beste.marge * 1.5;
    }).length;
    return goed / tussen.length >= 0.7 ? beste : null;
  }

  function isStabiel(lijst) {
    var bedragen = lijst.map(function (t) { return t.bedrag; }), med = mediaan(bedragen), uniek = {};
    bedragen.forEach(function (b) { uniek[b.toFixed(2)] = 1; });
    if (Object.keys(uniek).length <= Math.max(2, Math.floor(lijst.length / 5))) return true;
    return bedragen.filter(function (b) { return Math.abs(b - med) <= med * 0.12; }).length / bedragen.length >= 0.75;
  }

  function keurReeks(lijst, eind) {
    if (lijst.length < 2) return null;
    var ritme = vindRitme(lijst);
    if (!ritme) return null;
    var stabiel = isStabiel(lijst);
    var incasso = lijst.filter(function (t) { return t.incasso; }).length / lijst.length >= 0.7;
    var abo = !!(lijst[0].regel && lijst[0].regel.abo);
    if (lijst.length >= 3) {
      if (!(stabiel || incasso || abo)) return null;
    } else {
      var a = lijst[0].bedrag, b = lijst[1].bedrag, lijkt = Math.abs(a - b) <= Math.max(a, b) * 0.3;
      var nieuw = eind - lijst[1].dag <= ritme.dagen * 1.5 + 6;
      if (!((ritme.id === 'jaar' && lijkt && (incasso || abo)) || ((incasso || abo) && lijkt && nieuw && ritme.dagen >= 28))) return null;
    }
    return { ritme: ritme, stabiel: stabiel };
  }

  function vindVasteLasten(txs) {
    var eind = txs.length ? txs[txs.length - 1].dag : 0, groepen = {}, reeksen = [];
    txs.forEach(function (t) {
      if (t.stroom !== 'uit' || R.cats[t.cat].geenAbo && !(t.regel && t.regel.abo)) return;
      (groepen[t.sleutel] = groepen[t.sleutel] || []).push(t);
    });

    function voegToe(lijst, keur, extra) {
      reeksen.push({
        sleutel: lijst[0].sleutel + (extra ? '|' + extra : ''), winkelSleutel: lijst[0].sleutel,
        naam: lijst[0].winkel, cat: lijst[0].cat, soort: lijst[0].regel ? lijst[0].regel.soort : '',
        abo: !!(lijst[0].regel && lijst[0].regel.abo), ritme: keur.ritme, stabiel: keur.stabiel, txs: lijst,
        onzeker: !!keur.onzeker
      });
    }

    Object.keys(groepen).forEach(function (k) {
      var lijst = groepen[k];
      // per exact bedrag: zo vallen twee abonnementen bij dezelfde partij uit elkaar
      var perBedrag = {}, delen = [];
      lijst.forEach(function (t) { (perBedrag[t.bedrag.toFixed(2)] = perBedrag[t.bedrag.toFixed(2)] || []).push(t); });
      Object.keys(perBedrag).forEach(function (b) {
        if (perBedrag[b].length < 3) return;
        var keur = keurReeks(perBedrag[b], eind);
        if (keur) delen.push({ lijst: perBedrag[b], keur: keur });
      });
      var tegelijk = false;
      for (var i = 0; i < delen.length; i++) for (var j = i + 1; j < delen.length; j++) {
        var a = delen[i].lijst, b = delen[j].lijst;
        var overlap = Math.min(a[a.length - 1].dag, b[b.length - 1].dag) - Math.max(a[0].dag, b[0].dag);
        if (overlap > delen[i].keur.ritme.dagen * 1.5) tegelijk = true;
      }
      var heel = tegelijk ? null : keurReeks(lijst, eind);
      if (heel) voegToe(lijst, heel);
      else if (delen.length) delen.forEach(function (d) { voegToe(d.lijst, d.keur, delen.length > 1 ? d.lijst[0].bedrag.toFixed(2) : ''); });
      else {
        // één keer gezien, wel een doorlopende incasso of een bekend abonnement: waarschijnlijk per jaar
        var kandidaten = lijst.filter(function (t) { return t.doorlopend || (t.regel && t.regel.abo); });
        if (lijst.length === 1 && kandidaten.length === 1 && eind - lijst[0].dag >= 45 && lijst[0].bedrag >= 5) {
          voegToe(lijst, { ritme: JAAR, stabiel: true, onzeker: true });
        }
      }
    });
    return reeksen;
  }

  // de stand van een reeks op een bepaalde dag
  function standVan(reeks, peil) {
    var txs = reeks.txs.filter(function (t) { return t.dag <= peil; });
    if (!txs.length) return null;
    var r = reeks.ritme, laatste = txs[txs.length - 1], eerste = txs[0];
    var recent = txs.slice(-3).map(function (t) { return t.bedrag; });
    var nu = reeks.stabiel ? laatste.bedrag : mediaan(recent);
    var venster = txs.filter(function (t) { return t.dag > peil - 365; });
    var perJaar;
    if (reeks.stabiel) perJaar = nu * r.perJaar;
    else if (eerste.dag <= peil - 365 + r.dagen && venster.length) perJaar = som(venster, function (t) { return t.bedrag; });
    else perJaar = (venster.length ? som(venster, function (t) { return t.bedrag; }) / venster.length : nu) * r.perJaar;

    var grens = Math.min(r.dagen * 1.35 + 10, r.dagen + 45);
    var loopt = peil - laatste.dag <= grens;

    // duurder geworden: vergelijk met ongeveer een jaar eerder
    var toen = txs.filter(function (t) { return t.dag <= laatste.dag - 300 && t.dag >= laatste.dag - 430; }).map(function (t) { return t.bedrag; });
    if (!toen.length && laatste.dag - eerste.dag >= 150) toen = txs.slice(0, reeks.stabiel ? 1 : 3).map(function (t) { return t.bedrag; });
    var was = toen.length ? mediaan(toen) : 0, stijging = null;
    if (was > 0 && nu > was * (reeks.stabiel ? 1.02 : 1.1) && nu - was >= 0.5) {
      stijging = { van: was, naar: nu, procent: Math.round((nu / was - 1) * 100), perJaar: (nu - was) * r.perJaar };
    }
    var cat = R.cats[reeks.cat] || {};
    return {
      sleutel: reeks.sleutel, winkelSleutel: reeks.winkelSleutel, naam: reeks.naam, cat: reeks.cat, soort: reeks.soort,
      ritme: r, bedrag: rond(nu), perJaar: rond(perJaar), perMaand: rond(perJaar / 12),
      eerste: eerste.dag, laatste: laatste.dag, aantal: txs.length, loopt: loopt, onzeker: reeks.onzeker,
      volgende: laatste.dag + Math.round(r.dagen), stijging: stijging, stabiel: reeks.stabiel,
      type: reeks.abo ? 'opzegbaar' : (cat.type || 'vast')
    };
  }

  /* ---------- alles bij elkaar ---------- */

  function maakData(lijsten, eigenRegels) {
    var txs = herken(voegSamen(lijsten), eigenRegels);
    if (!txs.length) throw new Error('Ik vind geen af- en bijschrijvingen.');
    return { txs: txs, begin: txs[0].dag, eind: txs[txs.length - 1].dag, reeksen: vindVasteLasten(txs) };
  }

  function periodes(data) {
    var lijst = [], j1 = datumVan(data.begin).getUTCFullYear(), j2 = datumVan(data.eind).getUTCFullYear();
    for (var j = j2; j >= j1; j--) {
      var van = Math.max(dagVan(j, 1, 1), data.begin), tot = Math.min(dagVan(j, 12, 31), data.eind);
      if (tot - van + 1 >= 28) lijst.push({ id: String(j), label: String(j), van: van, tot: tot, jaar: j });
    }
    if (data.eind - data.begin > 400 || !lijst.length) {
      lijst.push({ id: '12m', label: 'Laatste 12 maanden', van: Math.max(data.begin, data.eind - 364), tot: data.eind });
    }
    if (lijst.length > 1 && data.eind - data.begin > 400) lijst.push({ id: 'alles', label: 'Alles', van: data.begin, tot: data.eind });
    var kies = lijst[0];
    if (kies.jaar && kies.tot - kies.van < 150) {
      kies = lijst.filter(function (p) { return p.id === '12m'; })[0] || lijst[0];
    }
    lijst.forEach(function (p) { p.dagen = p.tot - p.van + 1; p.maanden = p.dagen / 30.44; p.standaard = p === kies; });
    return lijst;
  }

  function analyseer(data, periode) {
    var P = periode, txs = data.txs.filter(function (t) { return t.dag >= P.van && t.dag <= P.tot; });
    var uit = 0, binnen = 0, sparen = 0, cats = {}, inkomen = {}, winkels = {}, maanden = {}, perDag = {}, weekdag = [0, 0, 0, 0, 0, 0, 0];

    function maandSleutel(t) { return t.jaar + '-' + (t.maand < 10 ? '0' : '') + t.maand; }
    // alle maanden in de periode, ook lege
    (function () {
      var d = datumVan(P.van), j = d.getUTCFullYear(), m = d.getUTCMonth() + 1, e = datumVan(P.tot);
      while (j < e.getUTCFullYear() || (j === e.getUTCFullYear() && m <= e.getUTCMonth() + 1)) {
        var van = Math.max(P.van, dagVan(j, m, 1)), tot = Math.min(P.tot, dagVan(j, m + 1, 1) - 1);
        maanden[j + '-' + (m < 10 ? '0' : '') + m] = {
          sleutel: j + '-' + (m < 10 ? '0' : '') + m, jaar: j, maand: m, naam: MAANDEN[m - 1], kort: MAANDEN_KORT[m - 1],
          uit: 0, binnen: 0, heel: tot - van + 1 >= dagVan(j, m + 1, 1) - dagVan(j, m, 1) - 1
        };
        if (++m > 12) { m = 1; j++; }
      }
    })();

    txs.forEach(function (t) {
      var m = maanden[maandSleutel(t)];
      if (t.stroom === 'uit' || t.stroom === 'terug') {
        var teken = t.stroom === 'uit' ? 1 : -1, b = t.bedrag * teken;
        uit += b;
        var c = cats[t.cat] = cats[t.cat] || { id: t.cat, label: R.cats[t.cat].label, totaal: 0, aantal: 0, winkels: {} };
        c.totaal += b; if (teken > 0) c.aantal++;
        var w = winkels[t.sleutel] = winkels[t.sleutel] || { sleutel: t.sleutel, naam: t.winkel, cat: t.cat, totaal: 0, aantal: 0, verplaatst: !!t.verplaatst };
        w.totaal += b; if (teken > 0) w.aantal++;
        c.winkels[t.sleutel] = w;
        if (m) m.uit += b;

      } else if (t.stroom === 'in') {
        binnen += t.bedrag;
        var ic = inkomen[t.cat] = inkomen[t.cat] || { id: t.cat, label: R.inkomen[t.cat].label, totaal: 0, aantal: 0 };
        ic.totaal += t.bedrag; ic.aantal++;
        if (m) m.binnen += t.bedrag;
      } else if (t.stroom === 'sparen') {
        sparen += t.af ? t.bedrag : -t.bedrag;
      }
    });

    var catLijst = Object.keys(cats).map(function (k) {
      var c = cats[k];
      c.winkels = Object.keys(c.winkels).map(function (s) { return c.winkels[s]; }).sort(function (a, b) { return b.totaal - a.totaal; });
      c.aandeel = uit > 0 ? c.totaal / uit : 0;
      return c;
    }).filter(function (c) { return c.totaal > 0.005 || c.aantal; }).sort(function (a, b) { return b.totaal - a.totaal; });
    var winkelLijst = Object.keys(winkels).map(function (k) { return winkels[k]; });
    var maandLijst = Object.keys(maanden).sort().map(function (k) { return maanden[k]; });

    // vaste lasten: stand aan het einde van de periode
    var peil = P.tot, vast = [], gestopt = [];
    data.reeksen.forEach(function (r) {
      var s = standVan(r, peil);
      if (!s) return;
      s.inPeriode = som(r.txs.filter(function (t) { return t.dag >= P.van && t.dag <= P.tot; }), function (t) { return t.bedrag; });
      if (s.loopt) vast.push(s);
      else if (s.laatste >= P.van && !s.onzeker) gestopt.push(s);
    });
    vast.sort(function (a, b) { return b.perJaar - a.perJaar; });
    gestopt.sort(function (a, b) { return b.perJaar - a.perJaar; });
    var vasteSleutels = {};
    vast.concat(gestopt).forEach(function (s) { vasteSleutels[s.winkelSleutel] = 1; });

    var vastPerJaar = som(vast, function (s) { return s.perJaar; });
    var opzegbaar = vast.filter(function (s) { return s.type === 'opzegbaar'; });

    // waar je het vaakst kwam: winkels waar je zelf afrekent, geen vaste lasten
    var bezoek = winkelLijst.filter(function (w) {
      return !vasteSleutels[w.sleutel] && w.aantal >= 2 && !/^(?:personen|overig|contant|creditcard|belasting|wonen|lenen|bank)$/.test(w.cat);
    }).sort(function (a, b) { return b.aantal - a.aantal || b.totaal - a.totaal; });

    var duursteDag = null;
    txs.forEach(function (t) {
      if (t.stroom !== 'uit' || vasteSleutels[t.sleutel]) return;
      perDag[t.dag] = (perDag[t.dag] || 0) + t.bedrag;
      weekdag[datumVan(t.dag).getUTCDay()] += t.bedrag;
    });
    Object.keys(perDag).forEach(function (d) { if (!duursteDag || perDag[d] > duursteDag.totaal) duursteDag = { dag: +d, totaal: perDag[d] }; });
    var grootste = txs.filter(function (t) { return t.stroom === 'uit' && !vasteSleutels[t.sleutel]; }).sort(function (a, b) { return b.bedrag - a.bedrag; }).slice(0, 6);
    var heleMaanden = maandLijst.filter(function (m) { return m.heel; });
    var duursteMaand = (heleMaanden.length ? heleMaanden : maandLijst).slice().sort(function (a, b) { return b.uit - a.uit; })[0];
    var rustigsteMaand = (heleMaanden.length ? heleMaanden : maandLijst).slice().sort(function (a, b) { return a.uit - b.uit; })[0];
    var besteWeekdag = weekdag.indexOf(Math.max.apply(null, weekdag));

    // mogelijk twee keer afgeschreven
    var dubbelTel = {}, dubbel = [];
    txs.forEach(function (t) {
      if (t.stroom !== 'uit' || t.bedrag < 5 || !(t.incasso || (t.regel && t.regel.abo))) return;
      var k = t.sleutel + '|' + t.dag + '|' + t.bedrag.toFixed(2);
      dubbelTel[k] = (dubbelTel[k] || 0) + 1;
      if (dubbelTel[k] === 2) dubbel.push(t);
    });

    var res = {
      periode: P, aantal: txs.length, uit: uit, binnen: binnen, sparen: sparen, over: binnen - uit,
      perDag: uit / P.dagen, perMaand: uit / P.maanden,
      cats: catLijst, inkomen: Object.keys(inkomen).map(function (k) { return inkomen[k]; }).sort(function (a, b) { return b.totaal - a.totaal; }),
      winkels: winkelLijst.sort(function (a, b) { return b.totaal - a.totaal; }), bezoek: bezoek,
      maanden: maandLijst, duursteMaand: duursteMaand, rustigsteMaand: rustigsteMaand, duursteDag: duursteDag,
      besteWeekdag: WEEKDAGEN[besteWeekdag], grootste: grootste,
      vast: vast, gestopt: gestopt, vastPerJaar: vastPerJaar, vastPerMaand: vastPerJaar / 12,
      opzegbaar: opzegbaar, opzegbaarPerJaar: som(opzegbaar, function (s) { return s.perJaar; }),
      dubbel: dubbel, eind: data.eind, begin: data.begin
    };
    res.cat = function (id) { return cats[id] || { id: id, label: R.cats[id].label, totaal: 0, aantal: 0, winkels: [], aandeel: 0 }; };
    res.acties = maakActies(res);
    return res;
  }

  /* ---------- de acties: wat je met dit overzicht kunt doen, de belangrijkste eerst ---------- */

  // per soort: [hoe het heet, de actie, de reden erbij]
  var SOORTEN = {
    video: ['streamingdiensten', 'Houd één streamingdienst aan', 'Wissel per maand. Je zegt zo op en bent zo weer terug.'],
    muziek: ['muziekdiensten', 'Kies één muziekdienst', 'Je muziek en je lijsten neem je mee.'],
    opslag: ['diensten voor opslag', 'Kies één plek voor je opslag', 'Zet je foto’s en bestanden bij elkaar.'],
    ai: ['AI-abonnementen', 'Kies één AI-abonnement', 'Een tweede neem je alleen de maand dat je hem nodig hebt.'],
    nieuws: ['abonnementen op nieuws', 'Kies welk nieuws je echt leest', 'Kranten geven vaak korting als je wilt opzeggen.'],
    boeken: ['abonnementen op boeken', 'Kies één abonnement op boeken', 'Luister of lees je bij allebei?'],
    sportschool: ['sportabonnementen', 'Kies één sportabonnement', 'Naar welke ga je echt?']
  };

  function opsomming(lijst) {
    if (lijst.length <= 1) return lijst.join('');
    return lijst.slice(0, -1).join(', ') + ' en ' + lijst[lijst.length - 1];
  }

  function maakActies(r) {
    var acties = [], P = r.periode, gebruikt = {};
    var maandNu = datumVan(r.eind).getUTCMonth() + 1;
    function perJaar(lijst) { return som(lijst, function (s) { return s.perJaar; }); }
    function namen(lijst) { return opsomming(lijst.map(function (s) { return s.naam; })); }

    // dubbel: twee of meer van hetzelfde
    Object.keys(SOORTEN).forEach(function (soort) {
      var lijst = r.vast.filter(function (s) { return s.soort === soort; });
      if (lijst.length < 2) return;
      var totaal = perJaar(lijst), duurste = Math.max.apply(null, lijst.map(function (s) { return s.perJaar; }));
      lijst.forEach(function (s) { gebruikt[s.sleutel] = 1; });
      acties.push({
        id: 'dubbel-' + soort, titel: SOORTEN[soort][1], score: totaal - duurste, items: lijst, opzeg: true,
        waarom: 'Je betaalt voor ' + lijst.length + ' ' + SOORTEN[soort][0] + ' tegelijk, samen ' + euro(totaal, false) + ' per jaar. ' + SOORTEN[soort][2],
        label: 'Scheelt tot ' + euro(totaal - duurste, false) + ' per jaar'
      });
    });

    // twee keer afgeschreven: geld dat je terug kunt halen
    if (r.dubbel.length) {
      var terug = som(r.dubbel, function (t) { return t.bedrag; });
      acties.push({
        id: 'tweekeer', titel: 'Vraag je geld terug', score: terug + 150, items: [],
        waarom: r.dubbel.slice(0, 3).map(function (t) { return t.winkel + ' schreef op ' + datum(t.dag) + ' twee keer ' + euro(t.bedrag) + ' af'; }).join('. ') +
          '. Klopt dat niet? Een incasso kun je binnen acht weken laten terugboeken via je bank.',
        label: 'Levert ' + euro(terug) + ' op'
      });
    }

    // jaarabonnementen die binnenkort verlengen
    var straks = r.vast.filter(function (s) { return s.ritme.id === 'jaar' && s.type !== 'vast' && s.volgende >= r.eind - 7 && s.volgende <= r.eind + 100; });
    if (straks.length) {
      acties.push({
        id: 'verlenging', score: perJaar(straks) * 1.2, items: straks, opzeg: true,
        titel: straks.length === 1 ? 'Beslis over ' + straks[0].naam + ' voor ' + datum(straks[0].volgende) : 'Zeg op voordat het verlengt',
        waarom: (straks.length === 1 ? 'Dit jaarabonnement wordt' : 'Deze ' + straks.length + ' jaarabonnementen worden') + ' binnenkort verlengd. Daarna zit je vaak weer een jaar vast.',
        label: 'Scheelt ' + euro(perJaar(straks), false) + ' als je opzegt'
      });
    }

    // duurder geworden
    var duurder = r.vast.filter(function (s) { return s.stijging && s.stijging.perJaar >= 6 && s.type !== 'vast'; })
      .sort(function (a, b) { return b.stijging.perJaar - a.stijging.perJaar; });
    if (duurder.length) {
      var meer = som(duurder, function (s) { return s.stijging.perJaar; });
      acties.push({
        id: 'duurder', titel: 'Loop na wat duurder werd', score: meer * 0.5, items: duurder, opzeg: true,
        waarom: (duurder.length === 1 ? duurder[0].naam + ' kost' : duurder.length + ' vaste lasten kosten samen') + ' meer dan een jaar geleden. Is het je dat nog waard?',
        label: 'Kost je ' + euro(meer, false) + ' per jaar meer'
      });
    }

    // klein en vergeten
    var klein = r.opzegbaar.filter(function (s) { return s.perMaand <= 10 && !gebruikt[s.sleutel]; });
    if (klein.length >= 2) {
      acties.push({
        id: 'klein', titel: 'Ruim je kleine abonnementen op', score: perJaar(klein) * 0.5, items: klein, opzeg: true,
        waarom: klein.length + ' abonnementen onder de tien euro per maand. Kleine bedragen vallen niet op. Weet je bij elk nog waarvoor het is?',
        label: 'Samen ' + euro(perJaar(klein), false) + ' per jaar'
      });
    }

    // loterijen
    var loten = r.vast.filter(function (s) { return s.cat === 'loterij'; }), lot = r.cat('loterij');
    if (lot.totaal >= 60) {
      var lotJaar = lot.totaal / P.maanden * 12;
      acties.push({
        id: 'loterij', titel: 'Reken je loterij na', score: lotJaar * 0.5, items: loten, opzeg: true,
        waarom: 'Je betaalt ' + euro(lotJaar, false) + ' per jaar aan loten. Heb je weleens uitgerekend wat je ervoor terugkreeg?',
        label: 'Samen ' + euro(lotJaar, false) + ' per jaar'
      });
    }

    // bezorgen
    var bez = r.cat('bezorgen');
    if (bez.aantal >= 6) {
      var gem = bez.totaal / bez.aantal;
      acties.push({
        id: 'bezorgen', titel: 'Bestel één keer per maand minder', score: gem * 12 * 0.6, items: [],
        waarom: 'Je liet ' + bez.aantal + ' keer eten bezorgen voor ' + euro(bez.totaal, false) + '. Dat is gemiddeld ' + euro(gem, false) + ' per keer.',
        label: 'Scheelt ' + euro(gem * 12, false) + ' per jaar'
      });
    }

    // verzekeringen
    var verz = r.vast.filter(function (s) { return s.cat === 'verzekeringen'; }), zorg = verz.filter(function (s) { return s.soort === 'zorg'; });
    if (verz.length) {
      var nu = zorg.length && maandNu >= 11, tekst;
      if (nu) tekst = 'Je betaalt ' + euro(perJaar(zorg), false) + ' per jaar aan ' + namen(zorg) + '. Half november zijn de nieuwe premies bekend en je kunt tot en met 31 december overstappen.';
      else tekst = 'Je betaalt ' + euro(perJaar(verz), false) + ' per jaar aan ' + namen(verz) + '. Kijk één keer per jaar of de dekking nog bij je past.';
      if (verz.length >= 2) tekst += ' Kijk ook of je iets dubbel hebt verzekerd. Reis, rechtsbijstand en aansprakelijkheid zitten vaak al in een pakket.';
      acties.push({
        id: 'verzekeringen', titel: nu ? 'Vergelijk je zorgverzekering voor 31 december' : verz.length >= 2 ? 'Loop je ' + verz.length + ' verzekeringen na' : 'Loop je verzekering na',
        score: perJaar(verz) * (nu ? 0.16 : 0.08), items: verz, waarom: tekst, label: 'Het gaat om ' + euro(perJaar(verz), false) + ' per jaar'
      });
    }

    // energie
    var energie = r.vast.filter(function (s) { return s.cat === 'energie' && s.perMaand >= 40; });
    if (energie.length) {
      acties.push({
        id: 'energie', titel: 'Vergelijk je energie', score: perJaar(energie) * 0.08, items: energie,
        waarom: 'Je betaalt ' + euro(som(energie, function (s) { return s.perMaand; }), false) + ' per maand aan ' + namen(energie) +
          '. Wie blijft zitten, betaalt meestal meer dan wie overstapt. Kijk wanneer je contract afloopt en vergelijk dan.',
        label: 'Het gaat om ' + euro(perJaar(energie), false) + ' per jaar'
      });
    }

    // telefoon en internet
    var tel = r.vast.filter(function (s) { return s.cat === 'telecom'; });
    if (tel.length) {
      acties.push({
        id: 'telecom', titel: 'Check je contract voor telefoon en internet', score: perJaar(tel) * 0.08, items: tel,
        waarom: 'Is je contract afgelopen, dan betaal je vaak nog voor een toestel dat al van jou is. Sim only of opnieuw onderhandelen is dan goedkoper.',
        label: 'Het gaat om ' + euro(perJaar(tel), false) + ' per jaar'
      });
    }

    // achteraf betalen
    var achteraf = r.cat('lenen').winkels.filter(function (w) { return /klarna|riverty|in3|billink|tinka/i.test(w.naam); });
    var keerAchteraf = som(achteraf, function (w) { return w.aantal; });
    if (keerAchteraf >= 4) {
      acties.push({
        id: 'achteraf', titel: 'Let op met achteraf betalen', score: 30, items: [],
        waarom: 'Je betaalde ' + keerAchteraf + ' keer achteraf via ' + opsomming(achteraf.map(function (w) { return w.naam; })) +
          '. Dat maakt uitgeven makkelijker dan je wilt. Een gemiste termijn kost meteen geld.',
        label: 'Samen ' + euro(som(achteraf, function (w) { return w.totaal; }), false)
      });
    }

    // creditcard: wat ik niet zie
    var cc = r.cat('creditcard');
    if (cc.totaal >= 100) {
      acties.push({
        id: 'creditcard', titel: 'Loop je creditcard na', score: 20, items: [],
        waarom: 'Wat je met je creditcard betaalde, zie ik hier niet. Daar zitten vaak abonnementen tussen.',
        label: 'Het gaat om ' + euro(cc.totaal, false)
      });
    }

    acties.sort(function (a, b) { return b.score - a.score; });
    return acties;
  }

  /* ---------- samenvatting voor je AI: geen namen van personen, geen rekeningnummers ---------- */

  function samenvatting(r) {
    var P = r.periode, regels = [];
    regels.push('Periode: ' + datum(P.van, true) + ' tot en met ' + datum(P.tot, true) + ' (' + Math.round(P.maanden) + ' maanden)');
    regels.push('Binnengekomen: ' + euro(r.binnen, false) + '. Uitgegeven: ' + euro(r.uit, false) + '. Naar sparen en beleggen: ' + euro(r.sparen, false) + '.');
    regels.push('');
    regels.push('UITGAVEN PER CATEGORIE');
    r.cats.forEach(function (c) {
      var top = c.id === 'personen' ? '' : c.winkels.slice(0, 4).map(function (w) { return w.naam + ' ' + euro(w.totaal, false); }).join(', ');
      regels.push('- ' + c.label + ': ' + euro(c.totaal, false) + ' (' + Math.round(c.aandeel * 100) + '%)' + (top ? '. Grootste: ' + top : ''));
    });
    regels.push('');
    regels.push('VASTE LASTEN EN ABONNEMENTEN DIE NU LOPEN');
    r.vast.forEach(function (s) {
      if (s.cat === 'personen') return;
      regels.push('- ' + s.naam + ' (' + R.cats[s.cat].label + '): ' + euro(s.bedrag) + ' ' + s.ritme.label + ', ' + euro(s.perJaar, false) + ' per jaar' +
        (s.stijging ? ', was ' + euro(s.stijging.van) : '') + (s.onzeker ? ', één keer gezien' : ''));
    });
    if (r.gestopt.length) {
      regels.push('');
      regels.push('GESTOPT IN DEZE PERIODE');
      r.gestopt.forEach(function (s) { if (s.cat !== 'personen') regels.push('- ' + s.naam + ': ' + euro(s.perJaar, false) + ' per jaar'); });
    }
    return regels.join('\n');
  }

  root.MW = {
    leesING: leesING, maakData: maakData, periodes: periodes, analyseer: analyseer, samenvatting: samenvatting,
    euro: euro, getal: getal, datum: datum, maandJaar: maandJaar, meervoud: meervoud, opsomming: opsomming,
    cats: R.cats, opzeggen: R.opzeggen || {}, MAANDEN: MAANDEN
  };
})(typeof window !== 'undefined' ? window : globalThis);
