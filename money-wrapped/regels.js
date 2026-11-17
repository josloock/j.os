/* Money Wrapped: de regels, categorieën en de namen die erbij horen.
   Een winkel of abonnement toevoegen: zet een regel bij de juiste categorie.

   Een regel is 'Naam=patroon' of 'Naam=patroon!vlag,vlag'.
   - Naam: zo komt hij in het overzicht. Leeg laten (=patroon) betekent: gebruik de
     naam van het afschrift. Dat is voor algemene woorden zoals 'restaurant'.
   - Patroon: kleine letters, zonder leestekens (bol.com wordt 'bol com'), met |
     tussen varianten. \\w* staat voor 'en wat erachter komt'. ^ betekent: de naam
     begint hiermee. Gebruik ^ bij korte, gewone woorden (action, plus, spar).
   - Vlaggen: 'abo' (een abonnement dat je kunt opzeggen), 'vast' (kun je niet
     zomaar opzeggen), 'n' (alleen in de naam zoeken, niet in de omschrijving) en
     een soort (video, muziek, opslag, ai, nieuws, sportschool, zorg) om dubbele
     abonnementen te vinden.
   De volgorde telt: de eerste regel die past, wint. */
(function (root) {
  'use strict';

  // type: wat je met een vaste last in deze categorie kunt doen
  var CATS = {
    wonen:        { label: 'Wonen', type: 'vast' },
    energie:      { label: 'Energie en water', type: 'overstappen' },
    verzekeringen:{ label: 'Verzekeringen', type: 'overstappen' },
    telecom:      { label: 'Telefoon en internet', type: 'overstappen' },
    boodschappen: { label: 'Boodschappen', type: 'opzegbaar', geenAbo: true },
    horeca:       { label: 'Uit eten en drinken', type: 'opzegbaar', geenAbo: true },
    bezorgen:     { label: 'Bezorgmaaltijden', type: 'opzegbaar', geenAbo: true },
    vervoer:      { label: 'Vervoer', type: 'vast' },
    winkelen:     { label: 'Winkelen', type: 'opzegbaar' },
    streaming:    { label: 'Streaming en media', type: 'opzegbaar', abo: true },
    software:     { label: 'Software en AI', type: 'opzegbaar', abo: true },
    sport:        { label: 'Sport', type: 'opzegbaar', abo: true },
    gezondheid:   { label: 'Zorg en verzorging', type: 'vast' },
    reizen:       { label: 'Reizen en vakantie', type: 'opzegbaar' },
    uit:          { label: 'Uitjes en vrije tijd', type: 'opzegbaar' },
    kinderen:     { label: 'Kinderen en school', type: 'vast' },
    loterij:      { label: 'Loterijen en gokken', type: 'opzegbaar', abo: true },
    goededoelen:  { label: 'Goede doelen', type: 'opzegbaar', abo: true },
    belasting:    { label: 'Belastingen en overheid', type: 'vast' },
    bank:         { label: 'Bankkosten', type: 'overstappen' },
    creditcard:   { label: 'Creditcard', type: 'vast', geenAbo: true },
    lenen:        { label: 'Lenen en achteraf betalen', type: 'vast' },
    contant:      { label: 'Contant opgenomen', type: 'vast', geenAbo: true },
    personen:     { label: 'Overboekingen en Tikkie', type: 'vast' },
    overig:       { label: 'Overig', type: 'vast' },
    // tellen niet mee als uitgave
    sparen:       { label: 'Sparen en beleggen', buiten: true },
    eigen:        { label: 'Eigen rekeningen (telt niet mee)', buiten: true }
  };

  var INKOMEN = {
    salaris:        { label: 'Salaris' },
    toeslagen:      { label: 'Belastingdienst' },
    uitkering:      { label: 'Uitkering, pensioen en studie' },
    rente:          { label: 'Rente' },
    terugbetaald:   { label: 'Van anderen' },
    inkomen_overig: { label: 'Overige inkomsten' }
  };

  var REGELS = {
    streaming: [
      'Netflix=netflix!video', 'Disney+=disney plus|disneyplus|disney!video', 'Videoland=videoland!video',
      'HBO Max=hbo max|hbomax|^max nl|wbd max!video', 'Prime Video=prime video|amazon prime|amzn prime|primevideo!video',
      'Viaplay=viaplay!video', 'SkyShowtime=skyshowtime!video', 'NPO Plus=npo plus|npo start|^npo!video',
      'Apple TV+=apple tv!video', 'YouTube Premium=youtube premium|youtubepremium|google youtube\\w*|^youtube!video',
      'ESPN=espn', 'Ziggo Sport=ziggo sport', 'Pathé Thuis=pathe thuis', 'Streamz=streamz!video', 'Mubi=^mubi!video',
      'Cinetree=cinetree!video', 'F1 TV=f1 tv|formula 1 digital', 'Canal+=canal plus|canal digitaal',
      'Spotify=spotify!muziek', 'Apple Music=apple music!muziek', 'Deezer=deezer!muziek', 'Tidal=^tidal!muziek',
      'YouTube Music=youtube music!muziek', 'SoundCloud=soundcloud!muziek',
      'Storytel=storytel!boeken', 'Audible=audible!boeken', 'BookBeat=bookbeat!boeken', 'Kobo Plus=kobo plus|kobo!boeken',
      'NRC=^nrc|nrc media!nieuws', 'de Volkskrant=volkskrant!nieuws', 'Trouw=^trouw!nieuws', 'Het Parool=parool!nieuws',
      'De Telegraaf=telegraaf!nieuws', 'AD=algemeen dagblad|^ad nl!nieuws', 'Het Financieele Dagblad=financieele dagblad|fd mediagroep!nieuws',
      'De Correspondent=correspondent!nieuws', 'Follow the Money=follow the money|^ftm!nieuws', 'DPG Media=dpg media!nieuws',
      'Mediahuis=mediahuis!nieuws', 'Blendle=blendle!nieuws', 'The Economist=economist!nieuws', 'The New York Times=new york times|nytimes!nieuws',
      'The Guardian=guardian!nieuws', 'De Groene Amsterdammer=groene amsterdammer!nieuws', 'Readly=readly!nieuws',
      'PlayStation=playstation|sony interactive!games', 'Xbox=xbox!games', 'Nintendo=nintendo!games', 'Steam=steampowered|steam purchase|^steam!games',
      'Twitch=twitch', 'Patreon=patreon', 'Substack=substack'
    ],
    software: [
      'ChatGPT=openai|chatgpt!ai', 'Claude=anthropic|claude ai!ai', 'Midjourney=midjourney!ai', 'Perplexity=perplexity!ai',
      'Gemini=google gemini|gemini advanced!ai', 'Cursor=^cursor!ai', 'ElevenLabs=elevenlabs!ai', 'Runway=runwayml|^runway!ai',
      'Google One=google one|google storage!opslag', 'iCloud=icloud!opslag', 'Dropbox=dropbox!opslag',
      'Google Workspace=google workspace|google gsuite|gsuite', 'Apple (App Store en iCloud)=apple com bill|itunes|apple services|^apple com',
      'Google Play=google play', 'Google=^google', 'Microsoft 365=microsoft 365|office 365|microsoft\\w*|msft', 'Adobe=adobe',
      'Notion=notion', 'Canva=canva', 'Figma=figma', 'GitHub=github', '1Password=1password', 'LastPass=lastpass', 'Bitwarden=bitwarden',
      'NordVPN=nordvpn|nord vpn|nordsec', 'ExpressVPN=expressvpn', 'Surfshark=surfshark', 'Proton=^proton', 'Zoom=zoom us|zoom video|^zoom',
      'Slack=^slack', 'LinkedIn=linkedin', 'Evernote=evernote', 'Todoist=todoist', 'Grammarly=grammarly', 'Duolingo=duolingo',
      'Headspace=headspace', 'Calm=calm com|^calm', 'Tinder=tinder', 'Bumble=bumble', 'Hinge=^hinge',
      'TransIP=transip', 'Hostnet=hostnet', 'Versio=^versio', 'Mijndomein=mijndomein', 'Strato=strato', 'GoDaddy=godaddy',
      'Squarespace=squarespace', 'Wix=wix com', 'Shopify=shopify', 'Mailchimp=mailchimp', 'Moneybird=moneybird', 'e-Boekhouden=e boekhouden',
      'Jortt=jortt', 'Capacities=capacities', 'Raycast=raycast', 'Descript=descript', 'Loom=^loom', 'Miro=^miro', 'Airtable=airtable',
      'Zapier=zapier', 'Typeform=typeform', 'Calendly=calendly', 'X=x corp|twitter', 'Meta=meta platforms|facebk|facebook',
      'Setapp=setapp', 'Readwise=readwise', 'Obsidian=obsidian', 'Superhuman=superhuman'
    ],
    energie: [
      'Vattenfall=vattenfall', 'Essent=essent', 'Eneco=eneco', 'Greenchoice=greenchoice', 'Budget Energie=budget energie',
      'Energiedirect=energiedirect', 'Oxxio=oxxio', 'Vandebron=vandebron', 'Pure Energie=pure energie', 'Engie=engie',
      'Innova Energie=innova energie', 'Mega Energie=mega energie', 'Frank Energie=frank energie', 'Tibber=tibber', 'Zonneplan=zonneplan',
      'ANWB Energie=anwb energie', 'UnitedConsumers=unitedconsumers|united consumers', 'Coolblue Energie=coolblue energie',
      'Delta Energie=delta energie', 'Powerpeers=powerpeers', 'NLE=nederlandse energie maatschappij|^nle', 'om | nieuwe energie=om nieuwe energie',
      'Vitens=vitens', 'Waternet=waternet', 'Evides=evides', 'Dunea=dunea', 'PWN=^pwn', 'Brabant Water=brabant water', 'WML=^wml',
      'Waterbedrijf Groningen=waterbedrijf groningen', 'WMD=^wmd', 'Oasen=oasen', 'Stadsverwarming=stadsverwarming|warmtebedrijf|stadswarmte'
    ],
    verzekeringen: [
      'Zilveren Kruis=zilveren kruis!zorg', 'CZ=^cz |^cz$|cz zorgverzeker\\w*|cz groep!zorg', 'VGZ=vgz!zorg', 'Menzis=menzis!zorg',
      'ONVZ=onvz!zorg', 'DSW=^dsw!zorg', 'Zorg en Zekerheid=zorg en zekerheid!zorg', 'Ditzo=ditzo!zorg', 'Anderzorg=anderzorg!zorg',
      'IZZ=^izz!zorg', 'IZA=^iza!zorg', 'UMC Zorgverzekering=umc zorgverzeker\\w*!zorg', 'Salland=salland!zorg', 'Just=^just zorg\\w*!zorg',
      'ZieZo=ziezo!zorg', 'Jaaah=jaaah!zorg', 'Bewuzt=bewuzt!zorg', 'UnitedConsumers Zorg=unitedconsumers zorg!zorg',
      'a.s.r.=a s r|^asr', 'Univé=unive', 'FBTO=fbto', 'Interpolis=interpolis', 'Centraal Beheer=centraal beheer',
      'Nationale-Nederlanden=nationale nederlanden|nn schade\\w*|nn leven\\w*|nn non life', 'InShared=inshared', 'OHRA=ohra', 'Aegon=aegon',
      'Allianz=allianz', 'Reaal=reaal', 'De Goudse=goudse', 'Klaverblad=klaverblad', 'Promovendum=promovendum', 'NH1816=nh1816|nh 1816',
      'Ineas=ineas', 'Allsecur=allsecur', 'HEMA Verzekeringen=hema verzeker\\w*', 'ANWB Verzekeringen=anwb verzeker\\w*',
      'DELA=^dela', 'Monuta=monuta', 'Yarden=yarden', 'Ardanta=ardanta', 'ARAG=^arag', 'DAS=das rechtsbijstand|^das ', 'Achmea=achmea',
      'ZLM=^zlm', 'Bovemij=bovemij', 'Petplan=petplan', 'Figo=figo dier\\w*', '=zorgverzeker\\w*!zorg', '=\\w*verzekering\\w*|assurantie\\w*'
    ],
    telecom: [
      'KPN=kpn', 'Ziggo=ziggo', 'Vodafone=vodafone', 'Odido=odido|t mobile', 'Tele2=tele2', 'Simyo=simyo', 'Ben=ben nederland',
      'Lebara=lebara', 'Youfone=youfone', 'Simpel=simpel nl|^simpel', 'Budget Thuis=budget thuis', 'Budget Mobiel=budget mobiel',
      'Delta=delta fiber\\w*|delta internet|^delta', 'hollandsnieuwe=hollandsnieuwe', '50+ Mobiel=50plus mobiel', 'Lycamobile=lycamobile',
      'Caiway=caiway', 'Online.nl=online nl', 'Freedom Internet=freedom internet', 'Solcon=solcon', 'Kliksafe=kliksafe'
    ],
    bezorgen: [
      'Thuisbezorgd=thuisbezorgd|takeaway com|just eat', 'Uber Eats=uber eats|ubereats|uber\\s+eats', 'Deliveroo=deliveroo',
      "Domino's=dominos|domino s", 'New York Pizza=new york pizza', 'Flink=^flink', 'Getir=getir', 'Gorillas=gorillas'
    ],
    boodschappen: [
      'Albert Heijn=albert heijn|ah to go|ah bezorg\\w*|ah online|^ah ', 'Jumbo=jumbo', 'Lidl=lidl', 'Aldi=aldi', 'PLUS=^plus ',
      'Dirk=^dirk v\\w*|^dirk \\d\\w*|^dirk fil\\w*', 'Picnic=picnic', 'Ekoplaza=ekoplaza', 'Coop=^coop', 'Spar=^spar ', 'Hoogvliet=hoogvliet', 'Vomar=vomar',
      'DekaMarkt=dekamarkt|^deka ', 'Crisp=^crisp', 'Jan Linders=jan linders', 'Poiesz=poiesz', 'Nettorama=nettorama', 'Boni=^boni ',
      'Odin=^odin', 'Marqt=marqt', 'Sligro=sligro', 'Makro=makro', 'Hanos=hanos', 'HelloFresh=hellofresh!abo', 'Marley Spoon=marley spoon!abo',
      '=supermarkt\\w*|slagerij\\w*|slager|bakker\\w*|groente\\w*|kaashandel|viswinkel|vishandel|toko|natuurwinkel'
    ],
    sport: [
      'Basic-Fit=basic fit!sportschool', 'SportCity=sportcity!sportschool', 'Fit For Free=fit for free!sportschool',
      'TrainMore=trainmore!sportschool', 'Anytime Fitness=anytime fitness!sportschool', 'David Lloyd=david lloyd!sportschool',
      'Urban Sports Club=urban sports\\w*|onefit!sportschool', 'ClassPass=classpass!sportschool', 'Saints and Stars=saints stars!sportschool',
      'Strava=strava', 'Zwift=zwift', 'Peloton=peloton', 'Whoop=whoop', 'Komoot=komoot', 'MyFitnessPal=myfitnesspal',
      'KNLTB=knltb', 'KNVB=knvb',
      '=sportschool|fitness\\w*|\\w*gym|yoga\\w*|pilates|crossfit\\w*|padel\\w*|tennis\\w*|zwembad|sportvereniging|voetbalvereniging|hockey\\w*|golfbaan|golfclub|klimhal|boulder\\w*'
    ],
    loterij: [
      'Postcode Loterij=postcode loterij|nationale postcode|^npl', 'Staatsloterij=staatsloterij|nederlandse loterij', 'VriendenLoterij=vriendenloterij',
      'BankGiro Loterij=bankgiro loterij', 'Lotto=^lotto', 'TOTO=^toto', 'Holland Casino=holland casino', 'Unibet=unibet', 'bet365=bet365',
      'BetCity=betcity', "Jack's=jacks casino|jacks nl", 'Kansino=kansino', 'Eurojackpot=eurojackpot', '=loterij\\w*|casino'
    ],
    goededoelen: [
      'Unicef=unicef', 'Rode Kruis=rode kruis', 'KWF=^kwf', 'Hartstichting=hartstichting', 'WWF=wereld natuur fonds|^wnf|^wwf',
      'Greenpeace=greenpeace', 'Artsen zonder Grenzen=artsen zonder grenzen', 'Amnesty=amnesty', 'Oxfam Novib=oxfam|novib',
      'CliniClowns=cliniclowns', 'War Child=war child', 'Natuurmonumenten=natuurmonumenten', 'Dierenbescherming=dierenbescherming',
      'Leger des Heils=leger des heils', 'Alzheimer Nederland=alzheimer', 'Diabetes Fonds=diabetes fonds', 'Longfonds=longfonds',
      'Nierstichting=nierstichting', 'Save the Children=save the children', 'Plan International=plan international|plan nederland',
      'Cordaid=cordaid', 'KiKa=^kika', 'Stichting Vluchteling=stichting vluchteling', 'Giro555=giro555|giro 555', 'Milieudefensie=milieudefensie',
      'Vogelbescherming=vogelbescherming', 'Wikipedia=wikimedia|wikipedia', 'Wakker Dier=wakker dier', 'Bits of Freedom=bits of freedom',
      '=donatie\\w*|kerk|kerkgenootschap|protestantse gemeente|parochie|diaconie|moskee'
    ],
    sparen: [
      '=oranje spaar\\w*|spaarrekening\\w*|spaardeposito|kinderspaar\\w*|groeirekening|bonusrente|spaarrente|naar spaar\\w*|van spaar\\w*',
      'DEGIRO=degiro|flatex', 'Meesman=meesman', 'Brand New Day=brand new day', 'Peaks=^peaks', 'BUX=^bux', 'Trade Republic=trade republic',
      'Saxo=saxo|binck\\w*', 'Bitvavo=bitvavo', 'Coinbase=coinbase', 'Kraken=^kraken', 'Binance=binance', 'Lynx=^lynx',
      'Interactive Brokers=interactive brokers', 'Raisin=raisin', '=belegging\\w*|beleggen|pensioen\\w*|lijfrente'
    ],
    eigen: [
      'Revolut=revolut', 'Wise=^wise|transferwise', 'N26=^n26'
    ],
    creditcard: [
      'Creditcard (ICS)=international card services|int card services|icscards|^ics ', 'American Express=american express|amex',
      'Creditcard=incasso creditcard|creditcard incasso|ing creditcard'
    ],
    lenen: [
      'Klarna=klarna', 'Riverty=riverty|afterpay', 'in3=^in3', 'Billink=billink', 'Santander=santander', 'Freo=^freo', 'Defam=defam',
      'DUO=^duo|dienst uitvoering onderwijs', 'Tinka=tinka', '=incassobureau\\w*|deurwaarder\\w*|gerechtsdeurwaarder\\w*|lening\\w*|krediet\\w*|studieschuld'
    ],
    bank: [
      'ING betaalpakket=kosten \\w*pakket\\w*|kosten betaalrekening|kosten tweede rekeninghouder|kosten zakelijk\\w*',
      'ING rente en kosten=debetrente|rente en kosten|kosten creditcard'
    ],
    belasting: [
      'Belastingdienst=belastingdienst', 'CJIB=cjib', 'CAK=^cak', 'RDW=^rdw', 'CBR=^cbr', 'KVK=^kvk|kamer van koophandel',
      '=gemeente\\w*|gbt|gblt|cocensus|sabewa|bsgw|belastingkantoor|svhw|^rbg|bghu|tribuut|hefpunt|waterschap\\w*|hoogheemraadschap\\w*|belastingsamenwerking\\w*|^bsr '
    ],
    wonen: [
      'Vesteda=vesteda', 'Ymere=ymere', 'Eigen Haard=eigen haard', 'Stadgenoot=stadgenoot', 'Rochdale=rochdale', 'Portaal=^portaal',
      'Woonstad Rotterdam=woonstad', 'Staedion=staedion', 'Holland2Stay=holland2stay', 'DUWO=duwo', 'SSH=^ssh',
      '=hypothe\\w*|obvion|florius|munt hypotheken|woonfonds|^huur\\w*|kale huur|woonhuur|woningcorporatie|woonstichting|woningstichting|vve|vereniging van eigenaren|erfpacht'
    ],
    kinderen: [
      'Partou=partou', 'Kinderrijk=kinderrijk', 'Smallsteps=smallsteps',
      '=kinderopvang\\w*|kinderdagverblijf|^bso |gastouder\\w*|peuterspeelzaal|ouderbijdrage|wis collect|schoolkassa|zwemles\\w*|basisschool|lyceum|gymnasium'
    ],
    reizen: [
      'Booking.com=booking com|booking bv|^booking', 'Airbnb=airbnb', 'KLM=^klm', 'Transavia=transavia', 'easyJet=easyjet', 'Ryanair=ryanair',
      'TUI=^tui', 'Corendon=corendon', 'Sunweb=sunweb', 'Vueling=vueling', 'Lufthansa=lufthansa', 'British Airways=british airways',
      'Wizz Air=wizz', 'Eurostar=eurostar|thalys', 'Deutsche Bahn=db bahn|deutsche bahn|db vertrieb', 'SNCF=sncf', 'Trainline=trainline',
      'Hotels.com=hotels com', 'Expedia=expedia', 'CheapTickets=cheaptickets', 'D-reizen=d reizen', 'Landal=landal', 'Center Parcs=center parcs',
      'Roompot=roompot', 'Eurocamp=eurocamp', 'Stayokay=stayokay', 'Belvilla=belvilla', 'GetYourGuide=getyourguide', 'Tiqets=tiqets',
      'Schiphol=schiphol', '=hotel\\w*|hostel\\w*|camping\\w*|vakantiepark|bungalow\\w*'
    ],
    uit: [
      'Pathé=pathe', 'Kinepolis=kinepolis', 'Vue=^vue ', 'Cineville=cineville!abo', 'Museumkaart=museumkaart|museumvereniging!abo',
      'Ticketmaster=ticketmaster', 'Eventim=eventim', 'TicketSwap=ticketswap', 'Eventbrite=eventbrite', 'Paylogic=paylogic',
      'TivoliVredenburg=tivoli\\w*', 'Paradiso=paradiso', 'Melkweg=melkweg', 'AFAS Live=afas live', 'Ziggo Dome=ziggo dome',
      'Efteling=efteling', 'Walibi=walibi', 'Artis=^artis', 'Blijdorp=blijdorp', 'Burgers Zoo=burgers zoo', 'CJP=^cjp',
      '=bioscoop|museum\\w*|theater\\w*|schouwburg|concert\\w*|festival\\w*|bowling\\w*|escape\\w*|sauna\\w*|wellness\\w*|thermen\\w*|bibliotheek|dierenpark\\w*|dierentuin|pretpark'
    ],
    vervoer: [
      'NS=^ns |ns groep|ns reizigers|ns internationaal', 'OV-chipkaart=ov chipkaart|ovpay|ov pay|translink|trans link', 'GVB=^gvb',
      'RET=^ret ', 'HTM=^htm', 'Connexxion=connexxion', 'Arriva=arriva', 'Qbuzz=qbuzz', 'Breng=^breng', 'Keolis=keolis', 'FlixBus=flixbus',
      'Shell=shell', 'BP=^bp ', 'Esso=esso', 'Texaco=texaco', 'Tango=^tango', 'TinQ=tinq', 'TotalEnergies=totalenergies|^total ',
      'Tamoil=tamoil', 'Argos=^argos', 'Avia=^avia ', 'Fastned=fastned', 'Allego=allego', 'Q-Park=q park|qpark', 'ParkMobile=parkmobile',
      'Yellowbrick=yellowbrick', 'EasyPark=easypark', 'ParkBee=parkbee', 'Interparking=interparking', 'APCOA=apcoa', 'Uber=^uber',
      'Bolt=^bolt', 'Swapfiets=swapfiets!abo', 'ANWB=anwb!abo', 'Greenwheels=greenwheels', 'MyWheels=mywheels', 'Sixt=^sixt',
      'SnappCar=snappcar', 'Felyx=felyx', 'Kwik-Fit=kwik fit', 'Carglass=carglass', 'LeasePlan=leaseplan|ayvens', 'Athlon=athlon',
      '=tankstation\\w*|parkeer\\w*|parking\\w*|parkeren|garage\\w*|autobedrijf\\w*|autoservice|private lease|fietsenmaker|fietsenwinkel|rijwiel\\w*|taxi\\w*'
    ],
    gezondheid: [
      'Kruidvat=kruidvat', 'Etos=^etos', 'DA=^da drog\\w*', 'Trekpleister=trekpleister', 'Holland & Barrett=holland barrett',
      'Pearle=pearle', 'Specsavers=specsavers', 'Hans Anders=hans anders', 'Eyewish=eyewish', 'Infomedics=infomedics', 'Famed=^famed',
      '=apotheek|pharma\\w*|farma\\w*|tandarts\\w*|tandheelkund\\w*|mondzorg|mondhygien\\w*|fysio\\w*|huisarts\\w*|ziekenhuis|^umc|kliniek\\w*|medisch\\w*|psycholo\\w*|opticien|kapper\\w*|kapsalon|barber\\w*|hairstyl\\w*|schoonheid\\w*|beautysalon|nagelstudio|massage\\w*|eigen risico'
    ],
    horeca: [
      "McDonald's=mcdonald\\w*|^mcd ", 'Burger King=burger king', 'KFC=^kfc', 'Subway=^subway', 'Starbucks=starbucks', 'FEBO=^febo',
      'La Place=la place', 'Bagels & Beans=bagels beans', 'Coffeecompany=coffeecompany|coffee company', 'Anne&Max=anne max', 'Doppio=doppio',
      'Five Guys=five guys', 'Vapiano=vapiano', 'Loetje=loetje', 'Happy Italy=happy italy', 'Wagamama=wagamama', 'Kiosk=^kiosk',
      "Julia's=julia s", 'Smullers=smullers', 'SLA=^sla ', 'Dunkin=dunkin',
      '=restaurant\\w*|ristorante|brasserie|bistro\\w*|eetcafe|\\w*cafe|grand cafe|lunchroom|pizzeria\\w*|pizza\\w*|sushi\\w*|grill\\w*|snackbar|cafetaria|koffie\\w*|coffee\\w*|espresso\\w*|ijssalon|burger\\w*|kebab|doner|wok\\w*|poke bowl|pokebowl|^poke |pannenkoek\\w*|bakery|tapas\\w*|trattoria|osteria|brouwerij|proeflokaal|kroeg|^bar |\\w+ bar|eetkamer|horeca'
    ],
    winkelen: [
      'bol=bol com|^bol ', 'Coolblue=coolblue', 'Amazon=amazon|amzn', 'Zalando=zalando', 'H&M=^h m |hennes', 'Zara=zara nederland|zara home|zara com|^zara \\d+', 'IKEA=ikea',
      'Action=^action', 'HEMA=hema', 'MediaMarkt=mediamarkt|media markt', 'Wehkamp=wehkamp', 'Decathlon=decathlon', 'Praxis=praxis',
      'Gamma=^gamma', 'Karwei=karwei', 'Hornbach=hornbach', 'Intratuin=intratuin', 'Xenos=xenos', 'Blokker=blokker', 'Primark=primark',
      'Uniqlo=uniqlo', 'AliExpress=aliexpress', 'Temu=^temu', 'Shein=shein', 'Vinted=vinted', 'Marktplaats=marktplaats', 'C&A=^c a ',
      'WE Fashion=we fashion', 'Nike=^nike', 'Adidas=adidas', 'About You=about you', 'ASOS=^asos', 'Mango=^mango', 'de Bijenkorf=bijenkorf',
      'Flying Tiger=flying tiger', 'Søstrene Grene=sostrene grene', 'Dille & Kamille=dille kamille', 'Bruna=bruna', 'AKO=^ako ',
      'Bever=^bever', 'Perry Sport=perry sport', 'Intersport=intersport', 'JD Sports=jd sports', 'Foot Locker=foot locker',
      'Apple Store=apple store|apple retail', 'LEGO=^lego', 'Intertoys=intertoys', 'Wibra=wibra', 'Zeeman=zeeman', 'TK Maxx=tk maxx',
      'Etsy=etsy', 'eBay=ebay', 'fonQ=fonq', 'Kwantum=kwantum', 'Leen Bakker=leen bakker', 'JYSK=jysk', 'Swiss Sense=swiss sense',
      'Beter Bed=beter bed', 'Hunkemöller=hunkemoller', 'The Sting=the sting', 'Suitsupply=suitsupply', 'Van Haren=van haren',
      'Omoda=omoda', 'Manfield=manfield', 'Rituals=rituals', 'Douglas=douglas', 'ICI Paris=ici paris', 'BCC=^bcc', 'Alternate=alternate',
      'Megekko=megekko', 'Amac=^amac', 'Belsimpel=belsimpel', 'Greetz=greetz', 'Kaartje2go=kaartje2go', 'Zooplus=zooplus',
      "Pets Place=pets place", 'Welkoop=welkoop', '=tuincentrum\\w*|bouwmarkt|boekhandel\\w*|bloemen\\w*|bloemist\\w*|juwelier\\w*|dierenwinkel|kringloop\\w*|webshop|warenhuis'
    ]
  };

  // de volgorde waarin categorieën worden nagelopen (specifiek voor algemeen)
  var VOLGORDE = ['streaming', 'software', 'energie', 'verzekeringen', 'telecom', 'bezorgen', 'boodschappen', 'sport',
    'loterij', 'goededoelen', 'sparen', 'eigen', 'creditcard', 'lenen', 'bank', 'belasting', 'wonen', 'kinderen',
    'reizen', 'uit', 'vervoer', 'gezondheid', 'horeca', 'winkelen'];

  // geld dat binnenkomt
  var INKOMEN_REGELS = [
    ['salaris', 'salaris\\w*|^loon|loon \\w+|salary|payroll|salarisbetaling'],
    ['toeslagen', 'belastingdienst'],
    ['uitkering', '^uwv|^svb|sociale verzekeringsbank|^duo|dienst uitvoering onderwijs|pensioen\\w*|^abp|^pfzw|uitkering\\w*|bijstand'],
    ['rente', 'rente']
  ];

  /* Waar je opzegt. De naam is de naam uit de regels hierboven.
     OPZEGGEN: de pagina van de aanbieder waar je opzegt of je abonnement beheert.
     OPZEG_UITLEG: de pagina van de aanbieder die uitlegt hoe je opzegt.
     Alleen adressen op de site van de aanbieder zelf. Staat een abonnement er niet
     bij, dan toont de pagina een zoeklink. Aanbieders verplaatsen hun pagina's:
     klik de lijst af en toe door.
     Stand november 2026: gevonden via zoekresultaten op de site van de aanbieder,
     nog niet één voor één doorgeklikt. Doe dat voordat de toepassing live gaat. */
  var OPZEGGEN = {
    // kijken, luisteren, spelen
    'Netflix': 'https://www.netflix.com/cancelplan',
    'YouTube Premium': 'https://www.youtube.com/paid_memberships',
    'YouTube Music': 'https://www.youtube.com/paid_memberships',
    'Tidal': 'https://account.tidal.com/',
    'Xbox': 'https://account.microsoft.com/services',
    // software
    'Microsoft 365': 'https://account.microsoft.com/services',
    'Zwift': 'https://www.zwift.com/billing/membership',
    // kranten en lezen
    'Het Financieele Dagblad': 'https://fd.nl/contact/cancel',
    // sport
    'Basic-Fit': 'https://www.basic-fit.com/nl-nl/opzeggen',
    'TrainMore': 'https://cancel.trainmore.nl/',
    // loterijen
    'Postcode Loterij': 'https://www.postcodeloterij.nl/opzeggen',
    'Staatsloterij': 'https://staatsloterij.nederlandseloterij.nl/abonnement-opzeggen',
    'VriendenLoterij': 'https://www.vriendenloterij.nl/over-opzeggen',
    // lidmaatschappen en goede doelen
    'ANWB': 'https://www.anwb.nl/lidmaatschap/opzeggen',
    'Unicef': 'https://www.unicef.nl/contact/lidmaatschap-opzeggen',
    'Rode Kruis': 'https://www.rodekruis.nl/wie-zijn-wij/contact/donatiebedrag-wijzigen/',
    'KWF': 'https://www.kwf.nl/doneren/donatie-opzeggen-of-wijzigen',
    'Hartstichting': 'https://www.hartstichting.nl/over-ons/contact/donateurs/wijzigen-of-stopzetten',
    'Greenpeace': 'https://www.greenpeace.org/nl/doneren/aanpassen-of-opzeggen/',
    'Artsen zonder Grenzen': 'https://www.artsenzondergrenzen.nl/contact/gegevens-wijzigen/donatie-opzeggen',
    'Amnesty': 'https://www.amnesty.nl/steun-ons/opzeggen-lidmaatschap',
    'Oxfam Novib': 'https://www.oxfamnovib.nl/contact/donatie-opzeggen-of-wijzigen',
    'Natuurmonumenten': 'https://www.natuurmonumenten.nl/service/lidmaatschap-opzeggen',
    'Dierenbescherming': 'https://www.dierenbescherming.nl/voor-leden/lidmaatschap-wijzigen-en-opzeggen'
  };
  var OPZEG_UITLEG = {
    // kijken, luisteren, spelen
    'Disney+': 'https://help.disneyplus.com/nl-NL/article/disneyplus-cancel',
    'HBO Max': 'https://help.hbomax.com/nl-nl/answer/detail/000002526',
    'Prime Video': 'https://www.amazon.nl/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y',
    'Apple TV+': 'https://support.apple.com/nl-nl/118398',
    'Spotify': 'https://support.spotify.com/nl/article/how-to-cancel-your-subscription/',
    'Apple Music': 'https://support.apple.com/nl-nl/118399',
    'Deezer': 'https://support.deezer.com/hc/en-gb/articles/214349245-Cancel-Your-Deezer-Subscription',
    'Storytel': 'https://support.storytel.com/hc/nl/articles/360010486719',
    'BookBeat': 'https://support.bookbeat.com/hc/nl/articles/205662511-Hoe-kan-ik-mijn-BookBeat-abonnement-opzeggen',
    'Kobo Plus': 'https://help.kobo.com/hc/nl/articles/360018976233',
    'PlayStation': 'https://www.playstation.com/nl-nl/support/store/cancel-ps-store-subscription/',
    'Nintendo': 'https://www.nintendo.com/nl-nl/Support/Nintendo-Switch/Hoe-je-de-automatische-verlenging-van-Nintendo-Switch-Online-beeindigt-of-de-instellingen-ervan-aanpast-1434298.html',
    'Patreon': 'https://support.patreon.com/hc/en-us/articles/360005502572-Canceling-a-paid-membership',
    // software en AI
    'ChatGPT': 'https://help.openai.com/en/articles/7232927-canceling-your-chatgpt-subscription',
    'Claude': 'https://support.claude.com/en/articles/8325617-cancel-your-pro-or-max-subscription',
    'Midjourney': 'https://docs.midjourney.com/hc/en-us/articles/25384024738573-Canceling-Your-Subscription',
    'Perplexity': 'https://www.perplexity.ai/help-center/en/articles/10354283-canceling-a-subscription',
    'Google One': 'https://support.google.com/googleone/answer/9056360?hl=nl',
    'Google Play': 'https://support.google.com/googleplay/answer/7018481?hl=nl',
    'iCloud': 'https://support.apple.com/nl-nl/108318',
    'Apple (App Store en iCloud)': 'https://support.apple.com/nl-nl/118428',
    'Dropbox': 'https://help.dropbox.com/plans/downgrade-dropbox-individual-plans',
    'Adobe': 'https://helpx.adobe.com/manage-account/using/cancel-subscription.html',
    'Notion': 'https://www.notion.com/help/upgrade-or-downgrade-your-plan',
    'Canva': 'https://www.canva.com/help/cancel-canva-plan/',
    '1Password': 'https://support.1password.com/manage-subscription/',
    'NordVPN': 'https://support.nordvpn.com/hc/en-us/articles/19556844985489-How-to-cancel-auto-renewal-for-your-NordVPN-subscription',
    'LinkedIn': 'https://www.linkedin.com/help/linkedin/answer/a545578/cancel-linkedin-premium?lang=nl',
    'Duolingo': 'https://www.duolingo.com/help/cancel-my-super-duolingo-subscription',
    'Headspace': 'https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription',
    'Calm': 'https://support.calm.com/hc/en-us/articles/115002473607-How-do-I-turn-off-auto-renewal-or-cancel-my-subscription-',
    'Tinder': 'https://www.help.tinder.com/hc/en-us/articles/115003554466-Cancel-your-subscription',
    'Strava': 'https://support.strava.com/en-us/articles/15401936-how-do-i-cancel-my-subscription',
    // kranten, sport, eten, lidmaatschappen
    'Follow the Money': 'https://help.ftm.nl/en/articles/4251012-i-want-to-cancel-my-subscription-what-should-i-do',
    'SportCity': 'https://www.sportcity.nl/veel-gestelde-vragen/opzeggen-herroepen',
    'Fit For Free': 'https://www.sportcity.nl/veel-gestelde-vragen/opzeggen-herroepen',
    'ClassPass': 'https://help.classpass.com/hc/en-us/articles/204578119-How-do-I-cancel-my-ClassPass-membership',
    'HelloFresh': 'https://www.hellofresh.nl/about/hoe-annuleer-ik-hellofresh',
    'Marley Spoon': 'https://support.marleyspoon.com/hc/nl/articles/6616123105935-Hoe-kan-ik-mijn-lidmaatschap-opzeggen',
    'Swapfiets': 'https://help.swapfiets.com/nl/hoe-kan-ik-mijn-abonnement-opzeggen',
    'Cineville': 'https://cineville.nl/nl-NL/klantenservice/lidmaatschap/hoe-zeg-ik-mijn-lidmaatschap-op',
    'WWF': 'https://www.wwf.nl/contact/opzeggen'
  };
  var opzeggen = {};
  Object.keys(OPZEGGEN).forEach(function (naam) { opzeggen[naam] = { url: OPZEGGEN[naam], uitleg: false }; });
  Object.keys(OPZEG_UITLEG).forEach(function (naam) { opzeggen[naam] = { url: OPZEG_UITLEG[naam], uitleg: true }; });

  root.MW_REGELS = { cats: CATS, inkomen: INKOMEN, regels: REGELS, volgorde: VOLGORDE, inkomenRegels: INKOMEN_REGELS, opzeggen: opzeggen };
})(typeof window !== 'undefined' ? window : globalThis);
