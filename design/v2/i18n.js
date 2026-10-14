(function () {
  // English lives in the HTML; this holds the French and swaps it in. Loaded
  // from <head>, which page-swap.js never re-runs, so it's set up once per
  // visit. Each page calls __i18n.apply() right after its <main>, before its
  // own scripts, so the cursor's copies and the hero's measurements are all
  // taken from text that's already in the right language.
  if (window.__i18n) return;

  var KEY = "lang";
  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function store(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }
  // A visitor's own choice wins; otherwise the site opens in French.
  var lang = (function () {
    var s = stored();
    if (s === "en" || s === "fr") return s;
    return "fr";
  })();

  // Blocks of text, by data-i18n key. Values are HTML.
  var FR = {
    "nav.home": "Accueil",
    "nav.work": "Projets",

    "hero.intro1":
      "<strong>Je suis en dernière année d’études d’ingénierie en IA.</strong> " +
      "Je développe des applications d’IA full-stack, j’entraîne et j’affine des " +
      "modèles pour des problèmes concrets, et j’ai une expérience de recherche en " +
      "vision par ordinateur.",
    "hero.intro2":
      "J’aime apprendre de nouvelles choses et je recherche des postes en ML " +
      "appliqué et en produits d’IA.",

    "sec.experience": "Expérience",
    "sec.toolkit": "Outils",
    "sec.certs": "Certifications",
    "sec.contact": "Écrivez-moi",

    "xp.aizen":
      "Développement d’une application web qui traite des données de types " +
      "variés pour classer les changements de version dans des documents de " +
      "spécifications pharmaceutiques. L’outil fournit un raisonnement automatisé " +
      "et une analyse visuelle, permettant aux relecteurs de gérer, modifier et " +
      "évaluer les risques de chaque modification.",
    "xp.enigma":
      "Conception d’un outil de recherche visuel qui transforme des articles " +
      "scientifiques complexes en graphes conceptuels interactifs et en résumés, " +
      "pour explorer des notions en profondeur et cartographier leurs relations " +
      "en cliquant sur les nœuds du graphe.",

    "kit.lang": "Langages",
    "kit.ds": "Science des données et ML",
    "kit.fw": "Frameworks et bibliothèques",
    "kit.dev": "Outils de développement",

    "contact.note": "À la recherche d’un premier poste en ML.",

    "work.title": 'Projets<span class="dot">.</span>',
    "work.sub":
      "Une sélection de projets réalisés dans différents domaines.",
    "work.backdoor":
      "Étude visant à déterminer si l’ASR-G permet de prédire le coût de " +
      "suppression des portes dérobées dans les grands modèles vision-langage. " +
      "À partir de BLIP-2, l’étude évalue 20 modèles compromis sur 120 " +
      "expériences de restauration et montre que ce coût augmente fortement " +
      "avec l’ASR-G, ce qui aide à choisir entre une réparation ciblée et un " +
      "réentraînement complet.",
    "work.hr":
      "Développement d’un modèle d’apprentissage automatique à double objectif, " +
      "à partir du jeu de données IBM HR Analytics, pour prévoir les départs " +
      "d’employés et modéliser l’évolution des rémunérations. En combinant la " +
      "probabilité de départ et les projections salariales, le modèle calcule " +
      "un indicateur de « perte salariale attendue » qui aide les organisations " +
      "à repérer les talents clés à risque et à prioriser leurs actions de " +
      "fidélisation.",
    "work.pde":
      "Développement sous PyTorch d’un modèle EDP contraint par la physique pour " +
      "filtrer le bruit de Poisson des images numériques, grâce à une " +
      "architecture fondée sur les mathématiques. En remplaçant les convolutions " +
      "denses par des différences finies géométriques, cette approche légère " +
      "réduit de 97,6 % le nombre de paramètres entraînables et ramène le temps " +
      "d’entraînement de plusieurs heures à quelques minutes, sans artefacts " +
      "visuels et avec une qualité compétitive.",
    "work.agentic":
      "Co-développement d’un plugin VS Code et d’une application web utilisant " +
      "Crew AI et le LLM Claude pour analyser et refactoriser intelligemment du " +
      "code complexe. Le système d’IA agentique raisonne sur une syntaxe " +
      "verbeuse pour proposer aux développeurs des simplifications pertinentes.",
    "work.satellite":
      "Développement d’un pipeline d’apprentissage profond qui automatise " +
      "l’inspection des lignes électriques en détectant l’empiètement de la " +
      "végétation sur des images satellite Sentinel-2. En combinant des modèles " +
      "pré-entraînés avec la localisation des corridors et des signaux " +
      "bitemporels d’évolution de la végétation, l’outil classe le risque avec " +
      "une précision élevée (AUC 0,79, F1 0,83) sur des régions absentes des " +
      "données d’entraînement. " +
      "L’objectif est d’informer les gestionnaires de lignes électriques et de " +
      "les alerter des dommages que l’empiètement peut causer à leur réseau.",
    "work.ann":
      "Étude approfondie en apprentissage profond consacrée à la classification " +
      "des stades de la maladie d’Alzheimer à partir d’IRM. Le projet consiste à " +
      "implémenter un réseau de neurones artificiels (ANN) classique et à le " +
      "comparer à des architectures CNN modernes comme LeNet, AlexNet, ZFNet, " +
      "VGGNet, GoogLeNet et ResNet, afin d’évaluer leurs performances " +
      "diagnostiques sur les principales métriques.",
    "work.auction":
      "Conception et développement d’une application web full-stack d’enchères " +
      "en ligne en temps réel, avec un frontend React responsive et un backend " +
      "robuste (Node.js/FastAPI) qui gère l’authentification des utilisateurs, " +
      "le suivi des enchères en direct et la base de données.",
  };

  // Short labels, matched on their own text wherever they appear as the
  // label of a link or button.
  var WORDS = {
    "View Work": "Voir mes projets",
    Live: "En ligne",
    Code: "Code",
    Paper: "Article",
    Report: "Rapport",
    PPT: "Diapos",
    Demo: "Démo",
    Verify: "Vérifier",
  };
  var MONTHS = {
    JAN: "JANV.",
    FEB: "FÉVR.",
    MAR: "MARS",
    APR: "AVR.",
    MAY: "MAI",
    JUN: "JUIN",
    JUL: "JUIL.",
    AUG: "AOÛT",
    SEP: "SEPT.",
    OCT: "OCT.",
    NOV: "NOV.",
    DEC: "DÉC.",
  };
  var PLACES = { "Hyderabad, India": "Hyderabad, Inde" };
  // Date phrases that read better restructured than word-for-word.
  var DATES = { "Jul – Present": "Depuis juil." };
  var TITLES = { "Work - Tharun": "Projets - Tharun" };
  var ARIA = {
    "Company site": "Site de l’entreprise",
    Language: "Langue",
  };

  function months(text) {
    return text.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/gi, function (m) {
      var fr = MONTHS[m.toUpperCase()];
      // Keep the source's casing: "Jun" -> "Juin", "MAR" -> "MARS".
      return m === m.toUpperCase()
        ? fr
        : fr.charAt(0) + fr.slice(1).toLowerCase();
    });
  }

  // Remembers each piece's English the first time it's touched, so switching
  // back works even on elements that outlive a page swap (the nav).
  function swapText(node, translate) {
    if (node.__en === undefined) node.__en = node.nodeValue;
    var en = node.__en;
    if (lang !== "fr") return (node.nodeValue = en);
    var core = en.trim();
    var out = translate(core);
    node.nodeValue = out == null ? en : en.replace(core, out);
  }
  function firstText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling)
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    return null;
  }

  function apply() {
    var doc = document;
    doc.documentElement.lang = lang;

    doc.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.__en === undefined) el.__en = el.innerHTML;
      var fr = FR[el.getAttribute("data-i18n")];
      el.innerHTML = lang === "fr" && fr != null ? fr : el.__en;
    });

    doc
      .querySelectorAll(".lk, .cert-more, .btn-cta")
      .forEach(function (el) {
        var t = firstText(el);
        if (t)
          swapText(t, function (s) {
            return WORDS[s];
          });
      });
    doc
      .querySelectorAll(".cert-meta, .xp-span, .item-year")
      .forEach(function (el) {
        var t = firstText(el);
        if (t)
          swapText(t, function (s) {
            return DATES[s] || months(s);
          });
      });
    doc.querySelectorAll(".place").forEach(function (el) {
      var t = firstText(el);
      if (t)
        swapText(t, function (s) {
          return PLACES[s];
        });
    });
    doc.querySelectorAll(".cert-shot img[alt]").forEach(function (img) {
      if (img.__en === undefined) img.__en = img.alt;
      var m = /^(.*) certificate$/.exec(img.__en);
      img.alt =
        lang === "fr" && m ? "Certificat « " + m[1] + " »" : img.__en;
    });
    doc.querySelectorAll("[aria-label]").forEach(function (el) {
      if (el.__enLabel === undefined) el.__enLabel = el.getAttribute("aria-label");
      var fr = ARIA[el.__enLabel];
      el.setAttribute("aria-label", lang === "fr" && fr ? fr : el.__enLabel);
    });
    if (lang === "fr" && TITLES[doc.title]) doc.title = TITLES[doc.title];

    doc.querySelectorAll(".lang-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    doc.documentElement.classList.remove("i18n-pending");
  }

  // Until apply() runs, a French visit would flash the English HTML; the
  // page CSS hides the text while this class is on. The timer is a safety
  // net so the page can never stay hidden.
  if (lang === "fr") {
    document.documentElement.classList.add("i18n-pending");
    setTimeout(function () {
      document.documentElement.classList.remove("i18n-pending");
    }, 1500);
  }

  // One listener for the whole visit; the toggle itself lives in the nav,
  // which page swaps keep. Switching re-renders the current page through the
  // same swap as Home/Work, so every page script re-measures the new text.
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".lang-btn");
    if (!b) return;
    var next = b.getAttribute("data-lang");
    if (next === lang) return;
    // Move the bar now, so it travels while the page swaps underneath (the
    // toggle itself is kept across the swap by page-swap.js).
    var group = b.closest(".lang-switch");
    if (group) {
      var btns = group.querySelectorAll(".lang-btn");
      var from = -1,
        to = -1;
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute("aria-pressed") === "true") from = i;
        if (btns[i] === b) to = i;
        btns[i].setAttribute("aria-pressed", String(btns[i] === b));
      }
      group.setAttribute("data-dir", to > from ? "right" : "left");
      setTimeout(function () {
        group.removeAttribute("data-dir");
      }, 450);
    }
    lang = next;
    store(lang);
    if (window.__swapTo) window.__swapTo(location.pathname + location.search);
    else location.reload();
  });

  window.__i18n = {
    apply: apply,
    get lang() {
      return lang;
    },
  };
})();
