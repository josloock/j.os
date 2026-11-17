/* Money Wrapped: een voorbeeld met verzonnen cijfers, in het formaat van een
   ING-export. Zo kun je zien wat de toepassing doet zonder eigen gegevens. */
(function (root) {
  'use strict';

  function maak() {
    var seed = 20261117;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function tussen(a, b) { return a + r() * (b - a); }
    function kies(a) { return a[Math.floor(r() * a.length)]; }
    function p2(n) { return (n < 10 ? '0' : '') + n; }

    var REK = 'NL12INGB0001234567', rijen = [];
    var begin = Date.UTC(2025, 0, 1), eind = Date.UTC(2026, 10, 17), DAG = 864e5;

    function voeg(t, naam, tegen, code, af, bedrag, soort, memo) {
      if (t < begin || t > eind) return;
      var d = new Date(t), dmj = p2(d.getUTCDate()) + '-' + p2(d.getUTCMonth() + 1) + '-' + d.getUTCFullYear();
      rijen.push({
        t: t, cel: [d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()), naam, REK, tegen, code, af ? 'Af' : 'Bij',
          bedrag.toFixed(2).replace('.', ','), soort, memo + ' Valutadatum: ' + dmj]
      });
    }
    function pin(t, naam, bedrag) {
      voeg(t, naam, '', 'BA', true, bedrag, 'Betaalautomaat', 'Pasvolgnr: 004 ' + p2(8 + Math.floor(r() * 13)) + ':' + p2(Math.floor(r() * 60)) +
        ' Transactie: ' + Math.floor(r() * 1e6).toString(36).toUpperCase() + ' Term: ' + Math.floor(r() * 1e6).toString(36).toUpperCase() + ' Apple Pay');
    }
    function incasso(t, naam, iban, bedrag, oms) {
      voeg(t, naam, iban, 'IC', true, bedrag, 'Incasso', 'Naam: ' + naam + ' Omschrijving: ' + oms + ' IBAN: ' + iban +
        ' Kenmerk: ' + Math.floor(r() * 1e9) + ' Machtiging ID: M' + iban.slice(-6) + ' Incassant ID: NL00ZZZ' + iban.slice(-9) + '0000 Doorlopende incasso');
    }
    function ideal(t, naam, iban, bedrag, oms) {
      voeg(t, naam, iban, 'ID', true, bedrag, 'iDEAL', 'Naam: ' + naam + ' Omschrijving: ' + oms + ' IBAN: ' + iban + ' Kenmerk: ' + Math.floor(r() * 1e12));
    }
    function over(t, naam, iban, af, bedrag, oms) {
      voeg(t, naam, iban, af ? 'GT' : 'OV', af, bedrag, af ? 'Online bankieren' : 'Overschrijving', 'Naam: ' + naam + ' Omschrijving: ' + oms + ' IBAN: ' + iban);
    }
    function elkeMaand(dag, f, van, tot) {
      for (var j = 2025; j <= 2026; j++) for (var m = 0; m < 12; m++) {
        var t = Date.UTC(j, m, dag);
        if ((!van || t >= van) && (!tot || t <= tot)) f(t, j, m);
      }
    }

    // inkomen
    elkeMaand(24, function (t, j, m) { over(t, 'Studio Noordkade B.V.', 'NL41RABO0312345678', false, j === 2025 ? 3640 : 3790, 'Salaris ' + ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'][m]); if (m === 4) over(t + DAG, 'Studio Noordkade B.V.', 'NL41RABO0312345678', false, 3260, 'Salaris vakantiegeld'); });
    elkeMaand(20, function (t) { over(t, 'Belastingdienst', 'NL86INGB0002445588', false, 123, 'Zorgtoeslag voorschot'); });

    // vaste lasten
    elkeMaand(1, function (t, j) { incasso(t, 'Vesteda Residential Fund', 'NL20ABNA0401234567', j === 2025 ? 1245 : 1299, 'Huur woning Havenstraat'); });
    elkeMaand(26, function (t, j) { incasso(t, 'Vattenfall Klantenservice N.V.', 'NL30INGB0001122334', j === 2025 ? 148 : 171, 'Termijnbedrag stroom en gas'); });
    elkeMaand(15, function (t, j, m) { if (m % 3 === 0) incasso(t, 'Waternet', 'NL55INGB0005566778', 62.4, 'Drinkwater voorschot'); });
    elkeMaand(27, function (t, j) { incasso(t, 'Zilveren Kruis Zorgverzekeringen', 'NL19INGB0009988776', j === 2025 ? 158.75 : 168.5, 'Premie basis plus aanvullend'); });
    elkeMaand(3, function (t) { incasso(t, 'Centraal Beheer', 'NL72RABO0123498765', 34.18, 'Pakket inboedel aansprakelijkheid reis'); });
    elkeMaand(12, function (t) { incasso(t, 'ANWB Verzekeringen', 'NL44INGB0006611223', 9.95, 'Doorlopende reisverzekering'); });
    elkeMaand(18, function (t) { incasso(t, 'KPN B.V.', 'NL47INGB0000069845', 57.5, 'Internet en tv factuur'); });
    elkeMaand(8, function (t) { incasso(t, 'Odido Netherlands B.V.', 'NL23INGB0007788990', 34, 'Mobiel abonnement met toestel'); });
    elkeMaand(28, function (t, j, m) { if (m >= 1 && m <= 10) incasso(t, 'Gemeente Amsterdam Belastingen', 'NL91INGB0004455667', 41.3, 'Afvalstoffenheffing termijn'); });

    // abonnementen
    elkeMaand(5, function (t) { pin0('NETFLIX.COM', t, t < Date.UTC(2026, 2, 1) ? 13.99 : 15.99); });
    elkeMaand(9, function (t) { pin0('Disney Plus', t, 9.99); });
    elkeMaand(14, function (t) { incasso(t, 'Videoland', 'NL60INGB0003344556', 9.99, 'Videoland Plus'); });
    elkeMaand(21, function (t) { pin0('HBO MAX AMSTERDAM', t, 7.99); }, 0, Date.UTC(2026, 3, 1));
    elkeMaand(2, function (t) { pin0('Spotify P2A4B6C8D0', t, t < Date.UTC(2025, 8, 1) ? 11.99 : 12.99); });
    elkeMaand(11, function (t) { pin0('APPLE.COM/BILL', t, 2.99); pin0('APPLE.COM/BILL', t, 10.99); });
    elkeMaand(16, function (t) { pin0('Google One', t, 1.99); });
    elkeMaand(6, function (t) { pin0('OPENAI *CHATGPT SUBSCR', t, 23); });
    elkeMaand(19, function (t) { pin0('ANTHROPIC CLAUDE.AI', t, 21.78); }, Date.UTC(2025, 5, 1));
    elkeMaand(22, function (t) { incasso(t, 'NRC Media B.V.', 'NL08INGB0002233445', 17.5, 'NRC digitaal'); });
    elkeMaand(25, function (t) { incasso(t, 'Nationale Postcode Loterij', 'NL89INGB0000005555', 16.5, 'Lot trekking'); });
    elkeMaand(4, function (t) { incasso(t, 'Stichting Unicef Nederland', 'NL86INGB0000000121', 7.5, 'Maandelijkse bijdrage'); });
    elkeMaand(10, function (t) { pin0('Storytel', t, 12.99); }, Date.UTC(2025, 9, 1));
    for (var b = Date.UTC(2025, 0, 6); b <= eind; b += 28 * DAG) incasso(b, 'Basic-Fit Nederland B.V.', 'NL14INGB0006677889', b < Date.UTC(2026, 0, 1) ? 29.99 : 32.99, 'Comfort lidmaatschap');
    incasso(Date.UTC(2025, 1, 3), 'ANWB B.V.', 'NL50INGB0000001234', 96.5, 'Wegenwacht Nederland');
    incasso(Date.UTC(2026, 1, 3), 'ANWB B.V.', 'NL50INGB0000001234', 102, 'Wegenwacht Nederland');
    incasso(Date.UTC(2025, 11, 9), 'Museumvereniging', 'NL33INGB0001010101', 75, 'Museumkaart volwassene');
    pin0('AMAZON PRIME NL', Date.UTC(2025, 11, 2), 49);
    incasso(Date.UTC(2026, 5, 12), 'TransIP B.V.', 'NL77INGB0002020202', 23.6, 'Domeinnaam en hosting');
    function pin0(naam, t, bedrag) { voeg(t, naam, '', 'BA', true, bedrag, 'Online bankieren', 'Pasvolgnr: 004 Transactie: ' + Math.floor(r() * 1e6).toString(36).toUpperCase() + ' Term: ECOM01'); }

    // creditcard en sparen
    elkeMaand(23, function (t) { incasso(t, 'International Card Services BV', 'NL63INGB0000000339', Math.round(tussen(40, 190)), 'Afrekening creditcard'); });
    elkeMaand(25, function (t) { voeg(t, 'Oranje Spaarrekening V12345678', '', 'GT', true, 250, 'Online bankieren', 'Naar Oranje Spaarrekening V12345678'); });
    voeg(Date.UTC(2026, 6, 14), 'Oranje Spaarrekening V12345678', '', 'GT', false, 900, 'Online bankieren', 'Van Oranje Spaarrekening V12345678');

    // het dagelijks leven
    var super_ = ['ALBERT HEIJN 1521 AMSTERDAM NLD', 'ALBERT HEIJN 1521 AMSTERDAM NLD', 'ALBERT HEIJN 1521 AMSTERDAM NLD', 'Jumbo Oostelijke Handelskade NLD', 'LIDL 412 AMSTERDAM NLD', 'AH to go Centraal NLD'];
    var horeca = ['CCV*CAFE DE WERF AMSTERDAM NLD', 'Coffeecompany Oostpoort NLD', 'SUMUP *BAKKER BART', 'Restaurant Kade 9 AMSTERDAM NLD', 'BAR BUKOWSKI AMSTERDAM NLD', 'Pizzeria Sotto AMSTERDAM NLD', "McDonald's Muiderpoort NLD", 'Brouwerij t IJ AMSTERDAM NLD'];
    var winkels = [['bol.com b.v.', 'NL27INGB0000026500', 12, 90], ['Coolblue B.V.', 'NL11INGB0006161616', 25, 320], ['Zalando Payments GmbH', 'DE86210700200123010101', 30, 150], ['Amazon EU SARL', 'LU890030123456781000', 9, 70]];
    for (var t = begin; t <= eind; t += DAG) {
      var wd = new Date(t).getUTCDay(), mnd = new Date(t).getUTCMonth();
      if (r() < (wd === 6 ? 0.75 : 0.36)) pin(t, kies(super_), wd === 6 ? tussen(34, 88) : tussen(6, 36));
      if (r() < (wd >= 5 || wd === 0 ? 0.42 : 0.16)) pin(t, kies(horeca), tussen(4, 58));
      if (r() < 0.155) ideal(t, 'Thuisbezorgd.nl via Takeaway.com', 'NL04INGB0007897897', tussen(18, 41), 'Bestelling ' + Math.floor(r() * 1e7) + ' Thuisbezorgd.nl');
      if (wd >= 1 && wd <= 4 && r() < 0.5) pin(t, 'NS GROEP IZ NS REIZIGERS', tussen(4.4, 19));
      if (r() < 0.035) pin(t, 'Shell Station Zeeburg NLD', tussen(48, 82));
      if (r() < 0.03) pin(t, 'Q-Park Oosterdok NLD', tussen(6, 24));
      if (r() < (mnd === 10 || mnd === 11 ? 0.2 : 0.085)) { var w = kies(winkels); ideal(t, w[0], w[1], tussen(w[2], w[3]), 'Order ' + Math.floor(r() * 1e9)); }
      if (r() < 0.05) pin(t, kies(['HEMA 204 AMSTERDAM NLD', 'Kruidvat 7781 AMSTERDAM NLD', 'ACTION 1088 AMSTERDAM NLD', 'Etos 7412 AMSTERDAM NLD', 'IKEA Amsterdam NLD']), tussen(5, 70));
      if (r() < 0.03) over(t, kies(['S de Wit', 'M Bakker', 'J Visser via Tikkie']), 'NL55ABNA0556677889', true, tussen(6, 45), kies(['Tikkie eten', 'Cadeau samen', 'Kaartjes']));
      if (r() < 0.035) over(t, kies(['S de Wit', 'L Jansen', 'AAB INZ TIKKIE']), 'NL31ABNA0445566778', false, tussen(8, 60), kies(['Tikkie', 'Boodschappen weekend', 'Terug van etentje']));
      if (r() < 0.012) voeg(t, 'ING Geldautomaat Javaplein', '', 'GM', true, kies([20, 40, 50, 100]), 'Geldautomaat', 'Pasvolgnr: 004 Geldautomaat');
      if (r() < 0.012) pin(t, kies(['Pathe City AMSTERDAM NLD', 'Kapsalon Knip en Klaar NLD', 'Apotheek Oostpoort NLD', 'Fysiotherapie IJburg NLD']), tussen(12, 64));
    }
    // een retour, vakanties, losse grote uitgaven, een dubbele incasso
    voeg(Date.UTC(2026, 3, 9), 'Zalando Payments GmbH', 'DE86210700200123010101', 'OV', false, 89.95, 'Overschrijving', 'Naam: Zalando Payments GmbH Omschrijving: Retour order 1099281 IBAN: DE86210700200123010101');
    ideal(Date.UTC(2025, 5, 2), 'Transavia Airlines C.V.', 'NL59INGB0001231231', 412.6, 'Boeking ABC123 Lissabon');
    ideal(Date.UTC(2025, 5, 4), 'Booking.com B.V.', 'NL27INGB0000265432', 684, 'Reservering 3391120');
    ideal(Date.UTC(2026, 4, 11), 'Transavia Airlines C.V.', 'NL59INGB0001231231', 538.2, 'Boeking XYZ789 Athene');
    ideal(Date.UTC(2026, 4, 14), 'Airbnb Payments', 'LU120010001234567891', 923.5, 'Reservering HMABCD');
    ideal(Date.UTC(2026, 8, 22), 'Coolblue B.V.', 'NL11INGB0006161616', 1149, 'Order 88120031 laptop');
    over(Date.UTC(2026, 1, 16), 'Tandartspraktijk IJburg', 'NL18INGB0003030303', true, 187.4, 'Nota 20260211');
    incasso(Date.UTC(2026, 8, 14), 'Videoland', 'NL60INGB0003344556', 9.99, 'Videoland Plus');

    rijen.sort(function (a, b) { return b.t - a.t; });
    var saldo = 2140.55, uit = ['"Datum";"Naam / Omschrijving";"Rekening";"Tegenrekening";"Code";"Af Bij";"Bedrag (EUR)";"Mutatiesoort";"Mededelingen";"Saldo na mutatie";"Tag"'];
    rijen.forEach(function (x) {
      var c = x.cel.concat([saldo.toFixed(2).replace('.', ','), '']);
      uit.push(c.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
      saldo += (c[5] === 'Af' ? 1 : -1) * parseFloat(c[6].replace(',', '.'));
    });
    return uit.join('\n');
  }

  root.MW_DEMO = { csv: maak };
})(typeof window !== 'undefined' ? window : globalThis);
