let tree;
let data = {};
let civs = {};
let connections;
let parentConnections;
let connectionpoints;
let focusedNodeId = null;

const unitClasses = {
    0: "Unused",
    1: "Infantry",
    2: "Turtle Ships",
    3: "Base Pierce",
    4: "Base Melee",
    5: "War Elephants",
    6: "Unused",
    7: "Unused",
    8: "Cavalry",
    9: "Unused",
    10: "Unused",
    11: "<abbr title='(except Port)'>All Buildings</abbr>",
    12: "Unused",
    13: "Stone Defense",
    14: "FE Predator Animals",
    15: "Archers",
    16: "Ships & Camels & Saboteurs",
    17: "Rams",
    18: "Trees",
    19: "<abbr title='(except Turtle Ship)'>Unique Units</abbr>",
    20: "Siege Weapons",
    21: "Standard Buildings",
    22: "Walls & Gates",
    23: "FE Gunpowder Units",
    24: "Boars",
    25: "Monks",
    26: "Castle",
    27: "Spearmen",
    28: "Cavalry Archers",
    29: "Eagle Warriors",
    30: "HD Camels",
    31: "Anti-Leitis",
    32: "Condottieros",
    33: "Organ Gun Damage",
    34: "Fishing Ships",
    35: "Mamelukes",
    36: "Heroes and Kings",
};

const locales = {
    en: "English",
    zh: "简体中文",
    tw: "繁體中文",
    fr: "Français",
    de: "Deutsch",
    hi: "हिंदी",
    it: "Italiano",
    jp: "日本語",
    ko: "한국어",
    ms: "Bahasa Melayu",
    ru: "Русский",
    es: "Español",
    mx: "Español (México)",
    tr: "Türkçe",
    vi: "Tiếng Việt",
    br: "Português (Brasil)",
};
const defaultLocale = "ru";

function loadLocale(localeCode) {
    if (!Object.keys(locales).includes(localeCode)) {
        localeCode = defaultLocale;
    }
    try {
        window.localStorage.setItem('locale', localeCode);
    } catch (e) {
        // pass
    }
    loadJson("assets/strings.json", function (strings) {
        data.strings = strings;
        createXRefBadges();
        displayData();
    });
}

function displayData() {
    // Reset containers
    const root = document.getElementById('root');
    if (root) {
        document.getElementById('techtree').removeChild(root);
    }
    document.getElementById('civselect').innerHTML = "";
    document.getElementById('key__table').innerHTML = "";

    tree = getDefaultTree();
    connections = getConnections();
    parentConnections = new Map(connections.map(([parent, child]) => [child, parent]));
    connectionpoints = getConnectionPoints(tree);
    fillCivSelector();

    const draw = SVG('techtree').id('root').size(tree.width, tree.height)
        .click((e) => {
            if (e.target.id === 'root') {
                hideHelp();
            }
        });

    document.getElementById('techtree').onclick = (e) => {
        if (e.target.id === 'techtree') {
            hideHelp();
        }
    };

    // Draw Age Row Highlighters
    let row_height = tree.height / 4;
    draw.rect(tree.width, row_height).attr({fill: '#4d3617', opacity:0.3}).click(hideHelp);
    draw.rect(tree.width, row_height).attr({fill: '#4d3617', opacity:0.3}).click(hideHelp).y(row_height * 2);

    // Add Age Icons
    let icon_height = Math.min(row_height / 2, 112);
    let icon_width = 112;
    let vertical_spacing = (row_height - icon_height) / 2 - 10;
    let margin_left = 20;
    let image_urls = ['dark_age_de.png', 'feudal_age_de.png', 'castle_age_de.png', 'imperial_age_de.png'];
    let age_names = [
        data.strings[data.age_names["Dark Age"]],
        data.strings[data.age_names["Feudal Age"]],
        data.strings[data.age_names["Castle Age"]],
        data.strings[data.age_names["Imperial Age"]]
    ];
    for (let i = 0; i < image_urls.length; i++) {
        let age_image_group = draw.group().click(hideHelp);
        let age_image = age_image_group.image('img/Ages/' + image_urls[i], icon_width, icon_height).y(row_height * i + vertical_spacing).x(margin_left);
        age_image_group.text(age_names[i])
            .font({size: 16, weight: 'bold'})
            .attr({fill: '#000000', opacity: 0.8, 'text-anchor': 'middle'})
            .move(icon_width / 2 + margin_left, age_image.attr('y') + icon_height + 5);
    }

    const connectionGroup = draw.group().attr({id: 'connection_lines'});
    for (let connection of connections) {
        let from = connectionpoints.get(connection[0]);
        let to = connectionpoints.get(connection[1]);
        let intermediate_height = from.y + (tree.element_height * 2 / 3);
        connectionGroup.polyline([from.x, from.y, from.x, intermediate_height, to.x, intermediate_height, to.x, to.y])
            .attr({id: `connection_${connection[0]}_${connection[1]}`})
            .addClass('connection')
            .click(hideHelp);
    }

    for (let lane of tree.lanes) {
        for (let r of Object.keys(lane.rows)) {
            let row = lane.rows[r];
            for (let caret of row) {
                var item = draw.group().attr({id: caret.id}).addClass('node')
                var rect = item.rect(caret.width, caret.height).attr({
                    fill: caret.type.colour,
                    id: `${caret.id}_bg`
                }).move(caret.x, caret.y);
                let name = formatName(caret.name);
                var text = item.text(name.toString())
                    .font({size: 9, weight: 'bold'})
                    .attr({fill: '#ffffff', opacity:0.95, 'text-anchor': 'middle', id: caret.id + '_text'})
                    .move(caret.x + caret.width / 2, caret.y + caret.height / 1.5);
                var image_placeholder = item.rect(caret.width * 0.6, caret.height * 0.6)
                    .attr({fill: '#000000', opacity:0.5, id: caret.id + '_imgph'})
                    .move(caret.x + caret.width * 0.2, caret.y);
                let prefix = 'img/';
                var image = item.image(prefix + imagePrefix(caret.id) + '.png', caret.width * 0.6, caret.height * 0.6)
                    .attr({id: caret.id + '_img'})
                    .move(caret.x + caret.width * 0.2, caret.y);
                var cross = item.polygon([1, 0, 3, 2, 5, 0, 6, 1, 4, 3, 6, 5, 5, 6, 3, 4, 1, 6, 0, 5, 2, 3, 0, 1])
                    .attr({fill: '#ff0000', opacity:0.5, id: caret.id + '_x'})
                    .addClass('cross')
                    .size(caret.width * 0.6, caret.height * 0.6)
                    .move(caret.x + caret.width * 0.2, caret.y);
                var overlaytrigger = item.rect(caret.width, caret.height)
                    .attr({id: caret.id + '_overlay'})
                    .addClass('node__overlay')
                    .move(caret.x, caret.y)
                    .data({'type': caret.type.type, 'caret': caret, 'name': caret.name, 'id': caret.id})
                    .mouseover(function () {
                        highlightPath(caret.id);
                    })
                    .mouseout(resetHighlightPath)
                    .click(function () {
                        displayHelp(caret.id);
                    });

            }
        }
    }


    let civWasLoaded = updateCivselectValue();
    if(!civWasLoaded){
        loadCiv();
    }
    create_colour_key();
    window.onhashchange = function () {
        updateCivselectValue();
    };
}

function updateCivselectValue() {
    let hash = window.location.hash.substr(1);
    let capitalisedHash = hash.substring(0, 1).toUpperCase() + hash.substring(1).toLowerCase();
    if (capitalisedHash in data.civ_names) {
        const civSelect = document.getElementById('civselect');
        if (civSelect.value !== capitalisedHash) {
            civSelect.value = capitalisedHash;
            loadCiv();
            return true;
        }
    }
    return false;
}

function setAdvancedStatsState() {
    try {
        let showAdvancedStats = localStorage.getItem('showAdvancedStats');
        let advancedStats = document.getElementById('advanced-stats');
        if (showAdvancedStats === 'true') {
            advancedStats.open = true;
        }
        advancedStats.onclick = onAdvancedStatsStateUpdate;
    } catch (e) {
        // pass
    }
}

function onAdvancedStatsStateUpdate() {
    try {
        localStorage.setItem('showAdvancedStats', (!document.getElementById('advanced-stats').open).toString());
    } catch (e) {
        // pass
    }
}

function imagePrefix(name) {
    return name.replace('_copy', '')
        .replace("building_", "Buildings/")
        .replace("unit_", "Units/")
        .replace("tech_", "Techs/");
}

function loadCiv() {
    const selectedCiv = document.getElementById('civselect').value;
    civ(selectedCiv, tree);
    if (selectedCiv in data.civ_helptexts) {
        document.getElementById('civtext').innerHTML = data.strings[data.civ_helptexts[selectedCiv]];
        document.getElementById('civlogo').src = `./assets/${selectedCiv.toLowerCase()}.png`;
        // window.location.hash = selectedCiv;
    } else {
        document.getElementById('civtext').innerHTML = "";
        document.getElementById('civlogo').src = document.getElementById('civlogo').dataset.transparent;
    }
    // hideHelp();
}

function loadJson(file, callback) {

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState === 4 && xobj.status === 200) {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(JSON.parse(xobj.responseText));
        }
    };
    xobj.send(null);
}

function resetHighlightPath() {
    unhighlightPath();
    if (focusedNodeId) {
        highlightPath(focusedNodeId);
    }
}

function unhighlightPath() {
    SVG.select('.node.is-highlight, .connection.is-highlight')
        .removeClass('is-highlight');
}

function highlightPath(caretId) {
    recurse(caretId);

    function recurse(caretId) {
        SVG.get(caretId).addClass('is-highlight');

        const parentId = parentConnections.get(caretId);
        if (!parentId) return;

        const line = SVG.get(`connection_${parentId}_${caretId}`);
        if (line) {
            // Move to the end of the <g> element so that it is drawn on top.
            // Without this, the line would be highlighted, but other unhighlighted
            // connection lines could be drawn on top, undoing the highlighting.
            line.front().addClass('is-highlight');
        }
        recurse(parentId);
    }
}

function displayHelp(caretId) {
    focusedNodeId = caretId;
    let helptextContent = document.getElementById("helptext__content");
    let helptextAdvancedStats = document.getElementById("helptext__advanced_stats");
    let overlay = SVG.get(`${caretId}_overlay`);
    let name = overlay.data('name');
    let id = overlay.data('id').replace('_copy', '');
    let caret = overlay.data('caret');
    let type = overlay.data('type');
    helptextContent.innerHTML = getHelpText(name, id, type);
    helptextAdvancedStats.innerHTML = getAdvancedStats(name, id, type);
    styleXRefBadges(name, id, type);
    positionHelptext(caret);
    resetHighlightPath();
}

function hideHelp() {
    focusedNodeId = null;
    const helptext = document.getElementById("helptext");
    helptext.style.display = "none";
    resetHighlightPath();
}

function positionHelptext(caret) {
    const helptext = document.getElementById("helptext");
    helptext.style.display = "block";
    positionHelptextBelow(caret, helptext)
    || positionHelptextAbove(caret, helptext)
    || positionHelptextToLeftOrRight(caret, helptext);
}

function positionHelptextBelow(caret, helptext) {
    let top = caret.y + caret.height + document.getElementById('root').getBoundingClientRect().top;
    let helpbox = helptext.getBoundingClientRect();
    if (top + helpbox.height > tree.height) {
        return false;
    }

    let destX = caret.x - helpbox.width;
    let techtree = document.getElementById('techtree');
    if (destX < 0 || destX - techtree.scrollLeft < 0) {
        destX = techtree.scrollLeft;
    }
    helptext.style.top = top + "px";
    helptext.style.left = destX + 'px';
    return true;
}

function positionHelptextAbove(caret, helptext) {
    let helpbox = helptext.getBoundingClientRect();
    let top = caret.y - helpbox.height + document.getElementById('root').getBoundingClientRect().top;
    if (top < 0) {
        return false;
    }

    let destX = caret.x - helpbox.width;
    let techtree = document.getElementById('techtree');
    if (destX < 0 || destX - techtree.scrollLeft < 0) {
        destX = techtree.scrollLeft;
    }
    helptext.style.top = top + "px";
    helptext.style.left = destX + 'px';
    return true;
}

function positionHelptextToLeftOrRight(caret, helptext) {
    let helpbox = helptext.getBoundingClientRect();
    let top = 0;
    let destX = caret.x - helpbox.width;
    let techtree = document.getElementById('techtree');
    if (destX < 0 || destX - techtree.scrollLeft < 0) {
        destX = caret.x + caret.width;
    }
    helptext.style.top = top + "px";
    helptext.style.left = destX + 'px';
}

function getHelpText(name, id, type) {
    let entitytype = getEntityType(type);
    const items = id.split('_', 1);
    id = id.substring(items[0].length + 1);
    let text = data.strings[data.data[entitytype][id]['LanguageHelpId']];
    if (text === undefined) {
        return "?";
    }
    text = text.replace(/\s<br>/g, '');
    text = text.replace(/\n/g, '');
    if (type === "TECHNOLOGY") {
        text = text.replace(/(.+?\(.+?\))(.*)/m,
            '<p class="helptext__heading">$1</p>' +
            '<p class="helptext__desc">$2</p>' +
            '<p class="helptext__stats">&nbsp;</p>');
    } else if (type === "UNIT" || type === "UNIQUEUNIT" ) {
        text = text.replace(/(.+?\(‹cost›\))(.+?)<i>\s*(.+?)<\/i>(.*)/m,
            '<p>$1</p>' +
            '<p>$2</p>' +
            '<p><em>$3</em></p>' +
            '<p class="helptext__stats">$4</p>');
    } else if (type === "BUILDING") {
        // convert the "Required for" text in <i> to <em> so that it doesn't break the next regex
        text = text.replace(/<b><i>(.+?)<\/b><\/i>/m, '<b><em>$1</em></b>');
        if (text.indexOf('<i>') >= 0) {
            text = text.replace(/(.+?\(‹cost›\))(.+?)<i>\s*(.+?)<\/i>(.*)/m,
                '<p>$1</p>' +
                '<p>$2</p>' +
                '<p><em>$3</em></p>' +
                '<p class="helptext__stats">$4</p>');
        } else {
            // Handle certain buildings like Wonders separately as the upgrades text is missing for them.
            text = text.replace(/(.+?\(‹cost›\))(.*)<br>(.*)/m,
                '<p>$1</p>' +
                '<p>$2</p>' +
                '<p class="helptext__stats">$3</p>');
        }
    }
    let meta = data.data[entitytype][id];
    if (meta !== undefined) {
        text = text.replace(/‹cost›/, "Cost: " + cost(meta.Cost));
        let stats = []
        if (text.match(/‹hp›/)) {
            stats.push("HP:&nbsp;" + meta.HP);
        }
        if (text.match(/‹attack›/)) {
            stats.push("Attack:&nbsp;" + meta.Attack);
        }
        if (text.match(/‹[Aa]rmor›/)) {
            stats.push("Armor:&nbsp;" + meta.MeleeArmor);
        }
        if (text.match(/‹[Pp]iercearmor›/)) {
            stats.push("Pierce armor:&nbsp;" + meta.PierceArmor);
        }
        if (text.match(/‹garrison›/)) {
            stats.push("Garrison:&nbsp;" + meta.GarrisonCapacity);
        }
        if (text.match(/‹range›/)) {
            stats.push("Range:&nbsp;" + meta.Range);
        }
        stats.push(ifDefinedAndGreaterZero(meta.MinRange, "Min Range:&nbsp;"));
        stats.push(ifDefined(meta.LineOfSight, "Line of Sight:&nbsp;"));
        stats.push(ifDefined(meta.Speed, "Speed:&nbsp;"));
        stats.push(secondsIfDefined(meta.TrainTime, "Build Time:&nbsp;"));
        stats.push(secondsIfDefined(meta.ResearchTime, "Research Time:&nbsp;"));
        stats.push(ifDefined(meta.FrameDelay, "Frame Delay:&nbsp;"));
        stats.push(ifDefinedAndGreaterZero(meta.MaxCharge, "Charge Attack:&nbsp;"));
        stats.push(ifDefinedAndGreaterZero(meta.RechargeRate, "Recharge Rate:&nbsp;"));
        stats.push(secondsIfDefined(meta.RechargeDuration, "Recharge Duration:&nbsp;"));
        stats.push(secondsIfDefined(meta.AttackDelaySeconds, "Attack Delay:&nbsp;"));
        stats.push(secondsIfDefined(meta.ReloadTime, "Reload Time:&nbsp;"));
        stats.push(accuracyIfDefined(meta.AccuracyPercent, "Accuracy:&nbsp;"));
        text = text.replace(/<p class="helptext__stats">(.+?)<\/p>/, "<h3>Stats</h3><p>" + stats.filter(Boolean).join(', ') + "<p>")
    } else {
        console.error("No metadata found for " + name);
    }
    return text;
}

function getAdvancedStats(name, id, type) {
    let entitytype = getEntityType(type);
    const items = id.split('_', 1);
    id = id.substring(items[0].length + 1);
    let meta = data.data[entitytype][id];
    let text = ''
    if (meta !== undefined) {
        text += arrayIfDefinedAndNonEmpty(meta.Attacks, '<h3>Attacks</h3>');
        text += arrayIfDefinedAndNonEmpty(meta.Armours, '<h3>Armours</h3>');
    } else {
        console.error("No metadata found for " + name);
    }
    return text;
}

function getEntityType(type) {
    let entitytype = 'buildings';
    if (type === "UNIT" || type === "UNIQUEUNIT") {
        entitytype = 'units';
    }
    if (type === "TECHNOLOGY") {
        entitytype = 'techs';
    }
    return entitytype;
}

/**
 * Create the Cross-Reference badges. This is done at load time in order to avoid re-making the
 * badges at runtime per-click on a new unit.
 *
 * @return A container with buttons + images for each civ to be used in cross referencing.
 */
  function createXRefBadges() {
    let xRefLinks = document.getElementById('helptext__x_ref__container');
    xRefLinks.innerHTML = '';
    for (let civ of Object.keys(data.civ_names)) {
        let xRefLink = document.createElement('button');
        xRefLink.addEventListener('click', function() {
          document.getElementById('civselect').value=civ;
          loadCiv();
        });

        let xRefImage = document.createElement('img');

        xRefImage.src = `./assets/${civ.toLowerCase()}.png`;
        xRefImage.title = data.strings[data.civ_names[civ]];
        xRefImage.id = `xRef__badge__${civ}`;
        xRefImage.classList.add('xRef__badge')
        xRefLink.appendChild(xRefImage);
        xRefLinks.appendChild(xRefLink);
    }
}

/**
 * Set on/off of all cross reference badges for a single unit.
 *
 * @param {string} name The name of the entity being cross-referenced.
 * @param {string} id The id of the entity being cross-referenced.
 * @param {string} type The type of the entity being cross-referenced.
 */
function styleXRefBadges(name, id, type) {
    for (let civ of Object.keys(data.civ_names)) {
        let xRefImage = document.getElementById(`xRef__badge__${civ}`);
        let found = false;
        // Make sure this civ exists
        if (civs[civ]) {
            if (type === "UNIT" || type === "UNIQUEUNIT") {
                if (civs[civ].units.map((id) => `unit_${id}`).includes(id)) {
                    found = true;
                } else if (`unit_${civs[`${civ}`].unique.castleAgeUniqueUnit}` === id || `unit_${civs[`${civ}`].unique.imperialAgeUniqueUnit}` === id) {
                    found = true;
                }
            } else if (type === "TECHNOLOGY") {
                if (civs[civ].techs.map((id) => `tech_${id}`).includes(id)) {
                    found = true;
                } else if (`tech_${civs[`${civ}`].unique.castleAgeUniqueTech}` === id || `tech_${civs[`${civ}`].unique.imperialAgeUniqueTech}` === id) {
                    found = true;
                }
            } else if (type === "BUILDING") {
                if (civs[civ].buildings.map((id) => `building_${id}`).includes(id)) {
                    found = true;
                }
            }
        }
        if (found) {
            xRefImage.style.opacity = '1.0';
        } else {
            xRefImage.style.opacity = '0.2';
        }
    }
}

function ifDefined(value, prefix) {
    if (value !== undefined) {
        return " " + prefix + value;
    } else {
        return "";
    }
}

function secondsIfDefined(value, prefix) {
    if (value !== undefined) {
        return " " + prefix + toMaxFixed2(value) + "s";
    } else {
        return "";
    }
}

function toMaxFixed2(value) {
    return Math.round(value * 100) / 100;
}

function accuracyIfDefined(value, prefix) {
    if (value !== undefined && value < 100) {
        return " " + prefix + value + "%";
    } else {
        return "";
    }
}

function ifDefinedAndGreaterZero(value, prefix) {
    if (value !== undefined && value > 0) {
        return " " + prefix + value;
    } else {
        return "";
    }
}

function arrayIfDefinedAndNonEmpty(attacks, prefix) {
    if (attacks === undefined || attacks.length < 1) {
        return "";
    } else {
        const strings = [];
        for (let attack of attacks) {
            const amount = attack['Amount'];
            const clazz = unitClasses[attack['Class']];
            strings.push(`${amount} (${clazz})`);
        }
        return prefix + '<p>' + strings.join(', ') + "</p>";
    }
}

function cost(cost_object) {
    let value = "";
    if ("Food" in cost_object) {
        value += " " + cost_object.Food + "F";
    }
    if ("Wood" in cost_object) {
        value += " " + cost_object.Wood + "W";
    }
    if ("Gold" in cost_object) {
        value += " " + cost_object.Gold + "G";
    }
    if ("Stone" in cost_object) {
        value += " " + cost_object.Stone + "S";
    }
    return value;
}

function create_colour_key() {
    let legend = [TYPES.UNIQUEUNIT, TYPES.UNIT, TYPES.BUILDING, TYPES.TECHNOLOGY];
    let kc = document.getElementById('key__table');
    let tr = null
    for (let index in legend) {
        if (index % 2 === 0) {
            tr = document.createElement('tr');
        }
        let td_color = document.createElement('td');
        td_color.style.backgroundColor = legend[index]['colour'];
        td_color.style.border = '1px outset #8a5d21';
        td_color.style.width = '23px';
        tr.appendChild(td_color);
        let td_type = document.createElement('td');
        td_type.innerText = data.strings[data.tech_tree_strings[legend[index]['name']]];
        tr.appendChild(td_type);
        if (index % 2 === 1) {
            kc.appendChild(tr);
        }
    }
    document.getElementById('key__label').innerText = data.strings[data.tech_tree_strings["Key"]];
}

function changeLocale() {
    const locale = document.getElementById('localeselect').value;
    loadLocale(locale);
}

function fillLocaleSelector(currentLocale) {
    Object.keys(locales).map(function(locale) {
        const option = document.createElement('option');
        option.setAttribute('value', locale);
        option.textContent = locales[locale];
        if (currentLocale === locale) {
            option.setAttribute('selected', '')
        }
        document.getElementById('localeselect').appendChild(option);
    });
}

function fillCivSelector() {
    Object.keys(data.civ_names).map(function(civ_name) {
        const option = document.createElement('option');
        option.setAttribute('value', civ_name);
        option.textContent = data.strings[data.civ_names[civ_name]];
        document.getElementById('civselect').appendChild(option);
    });
}

function civ(name) {
    let selectedCiv = civs[name];

    // SVG.select('.cross').each(function () {
    //     if (SVGObjectIsOpaque(this)) {
    //         return;
    //     }

    //     let {id, type} = parseSVGObjectId(this.id());
    //     if (id === undefined || type === undefined) {
    //         return;
    //     }

    //     if (type === 'unit') {
    //         if (selectedCiv.units.includes(id)) {
    //             return;
    //         }
    //     } else if (type === 'building') {
    //         if (selectedCiv.buildings.includes(id)) {
    //             return;
    //         }
    //     } else if (type === 'tech') {
    //         if (selectedCiv.techs.includes(id)) {
    //             return;
    //         }
    //     }
    //     makeSVGObjectOpaque(this);
    // });

    // enable(selectedCiv.buildings, [...selectedCiv.units, UNIQUE_UNIT, ELITE_UNIQUE_UNIT], [...selectedCiv.techs, UNIQUE_TECH_1, UNIQUE_TECH_2]);
    // unique([selectedCiv.unique.castleAgeUniqueUnit,
    //     selectedCiv.unique.imperialAgeUniqueUnit,
    //     selectedCiv.unique.castleAgeUniqueTech,
    //     selectedCiv.unique.imperialAgeUniqueTech], selectedCiv.monkPrefix);
}

function SVGObjectIsOpaque(svgObj) {
    return svgObj.attr('fill-opacity') === 1
}

function makeSVGObjectOpaque(svgObj) {
    svgObj.attr({'fill-opacity': 1});
}

function parseSVGObjectId(svgObjId) {
    const id_regex = /(.+)_([\d]+)_(x|copy)/;

    const found = svgObjId.match(id_regex);
    if (!found) {
        return {id: undefined, type: undefined};
    }
    let id = parseInt(found[2]);
    let type = found[1];

    return {id, type}
}

function techtreeDoesNotHaveScrollbar() {
    const techtreeElement = document.getElementById('techtree');
    return techtreeElement.scrollHeight <= techtreeElement.clientHeight;
}

function shiftKeyIsNotPressed(e) {
    return !e.shiftKey;
}

function main(){
    setAdvancedStatsState();

    let storedLocale = defaultLocale;
    try {
        storedLocale = window.localStorage.getItem('locale');
    } catch (e) {
        // pass
    }
    // fillLocaleSelector(storedLocale);

    // loadJson("assets/data.json", function (response) {
        data = {
            "age_names": {
                "Castle Age": "4203",
                "Dark Age": "4201",
                "Feudal Age": "4202",
                "Imperial Age": "4204"
            },
            "civ_helptexts": {
                "Aztecs": "120164",
                "Berbers": "120176",
                "Britons": "120150",
                "Bulgarians": "120181",
                "Burgundians": "120185",
                "Burmese": "120179",
                "Byzantines": "120156",
                "Celts": "120162",
                "Chinese": "120155",
                "Cumans": "120183",
                "Ethiopians": "120174",
                "Franks": "120151",
                "Goths": "120152",
                "Huns": "120166",
                "Incas": "120170",
                "Indians": "120169",
                "Italians": "120168",
                "Japanese": "120154",
                "Khmer": "120177",
                "Koreans": "120167",
                "Lithuanians": "120184",
                "Magyars": "120171",
                "Malay": "120178",
                "Malians": "120175",
                "Mayans": "120165",
                "Mongols": "120161",
                "Persians": "120157",
                "Portuguese": "120173",
                "Saracens": "120158",
                "Sicilians": "120186",
                "Slavs": "120172",
                "Spanish": "120163",
                "Tatars": "120182",
                "Teutons": "120153",
                "Turks": "120159",
                "Vietnamese": "120180",
                "Vikings": "120160"
            },
            "civ_names": {
                "Aztecs": "10285",
                "Berbers": "10297",
                "Britons": "10271",
                "Bulgarians": "10302",
                "Burgundians": "10306",
                "Burmese": "10300",
                "Byzantines": "10277",
                "Celts": "10283",
                "Chinese": "10276",
                "Cumans": "10304",
                "Ethiopians": "10295",
                "Franks": "10272",
                "Goths": "10273",
                "Huns": "10287",
                "Incas": "10291",
                "Indians": "10290",
                "Italians": "10289",
                "Japanese": "10275",
                "Khmer": "10298",
                "Koreans": "10288",
                "Lithuanians": "10305",
                "Magyars": "10292",
                "Malay": "10299",
                "Malians": "10296",
                "Mayans": "10286",
                "Mongols": "10282",
                "Persians": "10278",
                "Portuguese": "10294",
                "Saracens": "10279",
                "Sicilians": "10307",
                "Slavs": "10293",
                "Spanish": "10284",
                "Tatars": "10303",
                "Teutons": "10274",
                "Turks": "10280",
                "Vietnamese": "10301",
                "Vikings": "10281"
            },
            "data": {
                "buildings": {
                    "12": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 175
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1200,
                        "ID": 12,
                        "LanguageHelpId": 26135,
                        "LanguageNameId": 5135,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 50,
                        "internal_name": "Barracks Age1"
                    },
                    "45": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 150
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1800,
                        "ID": 45,
                        "LanguageHelpId": 26144,
                        "LanguageNameId": 5144,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 2,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 35,
                        "internal_name": "DOCK"
                    },
                    "49": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 200
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1500,
                        "ID": 49,
                        "LanguageHelpId": 26169,
                        "LanguageNameId": 5169,
                        "LineOfSight": 6,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 40,
                        "internal_name": "SIWS"
                    },
                    "50": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 60
                        },
                        "GarrisonCapacity": 0,
                        "HP": 480,
                        "ID": 50,
                        "LanguageHelpId": 26149,
                        "LanguageNameId": 5149,
                        "LineOfSight": 1,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 15,
                        "internal_name": "FARM"
                    },
                    "68": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 100
                        },
                        "GarrisonCapacity": 0,
                        "HP": 600,
                        "ID": 68,
                        "LanguageHelpId": 26157,
                        "LanguageNameId": 5157,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 35,
                        "internal_name": "MILL"
                    },
                    "70": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 25
                        },
                        "GarrisonCapacity": 0,
                        "HP": 550,
                        "ID": 70,
                        "LanguageHelpId": 26344,
                        "LanguageNameId": 5344,
                        "LineOfSight": 2,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 25,
                        "internal_name": "HOUS"
                    },
                    "71": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "Attacks": [
                            {
                                "Amount": 5,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Wood": 275
                        },
                        "GarrisonCapacity": 15,
                        "HP": 2400,
                        "ID": 71,
                        "LanguageHelpId": 26164,
                        "LanguageNameId": 5164,
                        "LineOfSight": 8,
                        "MeleeArmor": 4,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 6,
                        "ReloadTime": 2,
                        "TrainTime": 100,
                        "internal_name": "RTWC2"
                    },
                    "72": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 22
                            },
                            {
                                "Amount": 2,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 2
                        },
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 72,
                        "LanguageHelpId": 26202,
                        "LanguageNameId": 5202,
                        "LineOfSight": 2,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 5,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 7,
                        "internal_name": "WALL"
                    },
                    "79": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 7,
                                "Class": 16
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 30
                            },
                            {
                                "Amount": 7,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 125,
                            "Wood": 50
                        },
                        "GarrisonCapacity": 5,
                        "HP": 700,
                        "ID": 79,
                        "LanguageHelpId": 26178,
                        "LanguageNameId": 5178,
                        "LineOfSight": 10,
                        "MeleeArmor": 1,
                        "MinRange": 1,
                        "PierceArmor": 7,
                        "Range": 8,
                        "ReloadTime": 2,
                        "TrainTime": 80,
                        "internal_name": "WCTW"
                    },
                    "82": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 26
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 11,
                                "Class": 3
                            },
                            {
                                "Amount": 8,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 11,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 650
                        },
                        "GarrisonCapacity": 20,
                        "HP": 4800,
                        "ID": 82,
                        "LanguageHelpId": 26142,
                        "LanguageNameId": 5142,
                        "LineOfSight": 11,
                        "MeleeArmor": 8,
                        "MinRange": 1,
                        "PierceArmor": 11,
                        "Range": 8,
                        "ReloadTime": 2,
                        "TrainTime": 200,
                        "internal_name": "CSTL"
                    },
                    "84": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 175
                        },
                        "GarrisonCapacity": 0,
                        "HP": 1800,
                        "ID": 84,
                        "LanguageHelpId": 26161,
                        "LanguageNameId": 5161,
                        "LineOfSight": 6,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "ReloadTime": 2.5,
                        "TrainTime": 60,
                        "internal_name": "MRKT"
                    },
                    "87": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 175
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1500,
                        "ID": 87,
                        "LanguageHelpId": 26128,
                        "LanguageNameId": 5128,
                        "LineOfSight": 6,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 50,
                        "internal_name": "ARRG"
                    },
                    "101": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 175
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1500,
                        "ID": 101,
                        "LanguageHelpId": 26171,
                        "LanguageNameId": 5171,
                        "LineOfSight": 6,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 50,
                        "internal_name": "STBL"
                    },
                    "103": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 150
                        },
                        "GarrisonCapacity": 0,
                        "HP": 1800,
                        "ID": 103,
                        "LanguageHelpId": 26131,
                        "LanguageNameId": 5131,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 40,
                        "internal_name": "BLAC"
                    },
                    "104": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 175
                        },
                        "GarrisonCapacity": 10,
                        "HP": 2100,
                        "ID": 104,
                        "LanguageHelpId": 26138,
                        "LanguageNameId": 5138,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 2.5,
                        "TrainTime": 40,
                        "internal_name": "CRCH"
                    },
                    "109": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "Attacks": [
                            {
                                "Amount": 5,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Stone": 100,
                            "Wood": 275
                        },
                        "GarrisonCapacity": 15,
                        "HP": 2400,
                        "ID": 109,
                        "LanguageHelpId": 26164,
                        "LanguageNameId": 5164,
                        "LineOfSight": 8,
                        "MeleeArmor": 3,
                        "MinRange": 0,
                        "PierceArmor": 5,
                        "Range": 6,
                        "ReloadTime": 2,
                        "TrainTime": 100,
                        "internal_name": "RTWC"
                    },
                    "117": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 16,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 22
                            },
                            {
                                "Amount": 8,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Stone": 5
                        },
                        "GarrisonCapacity": 0,
                        "HP": 900,
                        "ID": 117,
                        "LanguageHelpId": 26203,
                        "LanguageNameId": 5203,
                        "LineOfSight": 2,
                        "MeleeArmor": 8,
                        "MinRange": 0,
                        "PierceArmor": 10,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 10,
                        "internal_name": "WALL2"
                    },
                    "155": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 24,
                                "Class": 11
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 22
                            },
                            {
                                "Amount": 12,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Stone": 5
                        },
                        "GarrisonCapacity": 0,
                        "HP": 3000,
                        "ID": 155,
                        "LanguageHelpId": 26204,
                        "LanguageNameId": 5204,
                        "LineOfSight": 2,
                        "MeleeArmor": 12,
                        "MinRange": 0,
                        "PierceArmor": 12,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 10,
                        "internal_name": "WALL3"
                    },
                    "199": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 100
                        },
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 199,
                        "LanguageHelpId": 26495,
                        "LanguageNameId": 5495,
                        "LineOfSight": 1,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 40,
                        "internal_name": "FTRAP"
                    },
                    "209": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 200
                        },
                        "GarrisonCapacity": 0,
                        "HP": 2100,
                        "ID": 209,
                        "LanguageHelpId": 26176,
                        "LanguageNameId": 5176,
                        "LineOfSight": 6,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 9,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 60,
                        "internal_name": "UNIV"
                    },
                    "234": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 2,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 30
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 125,
                            "Wood": 50
                        },
                        "GarrisonCapacity": 5,
                        "HP": 1500,
                        "ID": 234,
                        "LanguageHelpId": 26154,
                        "LanguageNameId": 5154,
                        "LineOfSight": 10,
                        "MeleeArmor": 2,
                        "MinRange": 1,
                        "PierceArmor": 8,
                        "Range": 8,
                        "ReloadTime": 2,
                        "TrainTime": 80,
                        "internal_name": "WCTW2"
                    },
                    "235": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 3,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 10,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 30
                            },
                            {
                                "Amount": 10,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 125,
                            "Wood": 50
                        },
                        "GarrisonCapacity": 5,
                        "HP": 2250,
                        "ID": 235,
                        "LanguageHelpId": 26155,
                        "LanguageNameId": 5155,
                        "LineOfSight": 10,
                        "MeleeArmor": 3,
                        "MinRange": 1,
                        "PierceArmor": 9,
                        "Range": 8,
                        "ReloadTime": 2,
                        "TrainTime": 80,
                        "internal_name": "WCTW3"
                    },
                    "236": {
                        "AccuracyPercent": 92,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 3,
                                "Class": 31
                            }
                        ],
                        "Attack": 120,
                        "Attacks": [
                            {
                                "Amount": 40,
                                "Class": 16
                            },
                            {
                                "Amount": 120,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 30
                            },
                            {
                                "Amount": 40,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 100,
                            "Stone": 125
                        },
                        "GarrisonCapacity": 5,
                        "HP": 2220,
                        "ID": 236,
                        "LanguageHelpId": 26156,
                        "LanguageNameId": 5156,
                        "LineOfSight": 10,
                        "MeleeArmor": 3,
                        "MinRange": 1,
                        "PierceArmor": 9,
                        "Range": 8,
                        "ReloadTime": 6,
                        "TrainTime": 80,
                        "internal_name": "WCTW4"
                    },
                    "276": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 0
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 1000,
                            "Stone": 1000,
                            "Wood": 1000
                        },
                        "GarrisonCapacity": 0,
                        "HP": 4800,
                        "ID": 276,
                        "LanguageHelpId": 26182,
                        "LanguageNameId": 5182,
                        "LineOfSight": 8,
                        "MeleeArmor": 3,
                        "MinRange": 0,
                        "PierceArmor": 10,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 3500,
                        "internal_name": "WNDR"
                    },
                    "487": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 20,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 22
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Stone": 30
                        },
                        "GarrisonCapacity": 0,
                        "HP": 1375,
                        "ID": 487,
                        "LanguageHelpId": 26185,
                        "LanguageNameId": 5185,
                        "LineOfSight": 6,
                        "MeleeArmor": 6,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 0,
                        "ReloadTime": 2.5,
                        "TrainTime": 70,
                        "internal_name": "GTAX2"
                    },
                    "562": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 100
                        },
                        "GarrisonCapacity": 0,
                        "HP": 600,
                        "ID": 562,
                        "LanguageHelpId": 26464,
                        "LanguageNameId": 5464,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 35,
                        "internal_name": "SMIL"
                    },
                    "584": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 100
                        },
                        "GarrisonCapacity": 0,
                        "HP": 600,
                        "ID": 584,
                        "LanguageHelpId": 26487,
                        "LanguageNameId": 5487,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 35,
                        "internal_name": "MINE"
                    },
                    "598": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Stone": 5,
                            "Wood": 25
                        },
                        "GarrisonCapacity": 0,
                        "HP": 500,
                        "ID": 598,
                        "LanguageHelpId": 26504,
                        "LanguageNameId": 5504,
                        "LineOfSight": 6,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "ReloadTime": 2.5,
                        "TrainTime": 15,
                        "internal_name": "WCTWX"
                    },
                    "621": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Stone": 100,
                            "Wood": 275
                        },
                        "GarrisonCapacity": 0,
                        "HP": 2400,
                        "ID": 621,
                        "LanguageHelpId": 26164,
                        "LanguageNameId": 5164,
                        "LineOfSight": 8,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 7,
                        "Range": 6,
                        "ReloadTime": 2,
                        "TrainTime": 150,
                        "internal_name": "RTWC1X"
                    },
                    "792": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 22
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 30
                        },
                        "GarrisonCapacity": 0,
                        "HP": 240,
                        "ID": 792,
                        "LanguageHelpId": 26186,
                        "LanguageNameId": 5186,
                        "LineOfSight": 6,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "ReloadTime": 2.5,
                        "TrainTime": 30,
                        "internal_name": "PGTAX"
                    },
                    "1021": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 10,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 250,
                            "Stone": 250
                        },
                        "GarrisonCapacity": 0,
                        "HP": 5200,
                        "ID": 1021,
                        "LanguageHelpId": 26159,
                        "LanguageNameId": 5159,
                        "LineOfSight": 6,
                        "MeleeArmor": 3,
                        "MinRange": 0,
                        "PierceArmor": 10,
                        "Range": 0,
                        "ReloadTime": 0,
                        "TrainTime": 120,
                        "internal_name": "FEITO"
                    },
                    "1251": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 26
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 11,
                                "Class": 3
                            },
                            {
                                "Amount": 8,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 350
                        },
                        "GarrisonCapacity": 20,
                        "HP": 2600,
                        "ID": 1251,
                        "LanguageHelpId": 26349,
                        "LanguageNameId": 5349,
                        "LineOfSight": 10,
                        "MeleeArmor": 8,
                        "MinRange": 1,
                        "PierceArmor": 11,
                        "Range": 7,
                        "ReloadTime": 2,
                        "TrainTime": 150,
                        "internal_name": "KREPOST"
                    },
                    "1665": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            },
                            {
                                "Amount": 1,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 7,
                                "Class": 16
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 30
                            },
                            {
                                "Amount": 7,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Stone": 200,
                            "Wood": 75
                        },
                        "GarrisonCapacity": 10,
                        "HP": 1000,
                        "ID": 1665,
                        "LanguageHelpId": 26544,
                        "LanguageNameId": 5544,
                        "LineOfSight": 10,
                        "MeleeArmor": 1,
                        "MinRange": 1,
                        "PierceArmor": 7,
                        "Range": 8,
                        "ReloadTime": 2,
                        "TrainTime": 90,
                        "internal_name": "DONJON"
                    }
                },
                "techs": {
                    "3": {
                        "Cost": {
                            "Gold": 450,
                            "Wood": 750
                        },
                        "ID": 3,
                        "LanguageHelpId": 28419,
                        "LanguageNameId": 7419,
                        "ResearchTime": 60,
                        "internal_name": "British Yeoman"
                    },
                    "4": {
                        "Cost": {
                            "Food": 750,
                            "Gold": 450
                        },
                        "ID": 4,
                        "LanguageHelpId": 28420,
                        "LanguageNameId": 7420,
                        "ResearchTime": 70,
                        "internal_name": "Mayan El Dorado"
                    },
                    "5": {
                        "Cost": {
                            "Food": 750,
                            "Gold": 450
                        },
                        "ID": 5,
                        "LanguageHelpId": 28421,
                        "LanguageNameId": 7421,
                        "ResearchTime": 50,
                        "internal_name": "Celtic Furor Celtica"
                    },
                    "6": {
                        "Cost": {
                            "Gold": 450,
                            "Wood": 500
                        },
                        "ID": 6,
                        "LanguageHelpId": 28422,
                        "LanguageNameId": 7422,
                        "ResearchTime": 60,
                        "internal_name": "Mongol Siege Drill"
                    },
                    "7": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 300
                        },
                        "ID": 7,
                        "LanguageHelpId": 28423,
                        "LanguageNameId": 7423,
                        "ResearchTime": 50,
                        "internal_name": "Persian Mahouts"
                    },
                    "8": {
                        "Cost": {
                            "Food": 75
                        },
                        "ID": 8,
                        "LanguageHelpId": 28008,
                        "LanguageNameId": 7008,
                        "ResearchTime": 25,
                        "internal_name": "Town Watch"
                    },
                    "9": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 450
                        },
                        "ID": 9,
                        "LanguageHelpId": 28424,
                        "LanguageNameId": 7424,
                        "ResearchTime": 50,
                        "internal_name": "Saracen Zealotry"
                    },
                    "10": {
                        "Cost": {
                            "Gold": 500,
                            "Stone": 450
                        },
                        "ID": 10,
                        "LanguageHelpId": 28425,
                        "LanguageNameId": 7425,
                        "ResearchTime": 40,
                        "internal_name": "Turkish Artillery"
                    },
                    "11": {
                        "Cost": {
                            "Food": 600,
                            "Stone": 400
                        },
                        "ID": 11,
                        "LanguageHelpId": 28426,
                        "LanguageNameId": 7426,
                        "ResearchTime": 60,
                        "internal_name": "Teuton Crenellations"
                    },
                    "12": {
                        "Cost": {
                            "Food": 250,
                            "Wood": 250
                        },
                        "ID": 12,
                        "LanguageHelpId": 28012,
                        "LanguageNameId": 7012,
                        "ResearchTime": 70,
                        "internal_name": "Crop rotation"
                    },
                    "13": {
                        "Cost": {
                            "Food": 125,
                            "Wood": 125
                        },
                        "ID": 13,
                        "LanguageHelpId": 28013,
                        "LanguageNameId": 7013,
                        "ResearchTime": 40,
                        "internal_name": "Heavy plow"
                    },
                    "14": {
                        "Cost": {
                            "Food": 75,
                            "Wood": 75
                        },
                        "ID": 14,
                        "LanguageHelpId": 28014,
                        "LanguageNameId": 7014,
                        "ResearchTime": 20,
                        "internal_name": "Horse collar"
                    },
                    "15": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 200
                        },
                        "ID": 15,
                        "LanguageHelpId": 28015,
                        "LanguageNameId": 7015,
                        "ResearchTime": 50,
                        "internal_name": "Guilds"
                    },
                    "16": {
                        "Cost": {
                            "Food": 450,
                            "Gold": 250
                        },
                        "ID": 16,
                        "LanguageHelpId": 28427,
                        "LanguageNameId": 7427,
                        "ResearchTime": 40,
                        "internal_name": "Gothic Anarchy"
                    },
                    "17": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 200
                        },
                        "ID": 17,
                        "LanguageHelpId": 28017,
                        "LanguageNameId": 7017,
                        "ResearchTime": 70,
                        "internal_name": "Banking"
                    },
                    "19": {
                        "Cost": {
                            "Food": 0,
                            "Gold": 0
                        },
                        "ID": 19,
                        "LanguageHelpId": 28019,
                        "LanguageNameId": 7019,
                        "ResearchTime": 1,
                        "internal_name": "Cartography"
                    },
                    "21": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 500
                        },
                        "ID": 21,
                        "LanguageHelpId": 28428,
                        "LanguageNameId": 7428,
                        "ResearchTime": 60,
                        "internal_name": "Hun Atheism"
                    },
                    "22": {
                        "Cost": {
                            "Gold": 50
                        },
                        "ID": 22,
                        "LanguageHelpId": 28022,
                        "LanguageNameId": 7022,
                        "ResearchTime": 25,
                        "internal_name": "Loom"
                    },
                    "23": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 100
                        },
                        "ID": 23,
                        "LanguageHelpId": 28023,
                        "LanguageNameId": 7023,
                        "ResearchTime": 70,
                        "internal_name": "Coinage"
                    },
                    "24": {
                        "Cost": {
                            "Food": 450,
                            "Gold": 750
                        },
                        "ID": 24,
                        "LanguageHelpId": 28429,
                        "LanguageNameId": 7429,
                        "ResearchTime": 60,
                        "internal_name": "Aztec Garland Wars"
                    },
                    "39": {
                        "Cost": {
                            "Food": 150
                        },
                        "ID": 39,
                        "LanguageHelpId": 28039,
                        "LanguageNameId": 7039,
                        "ResearchTime": 40,
                        "internal_name": "Husbandry"
                    },
                    "45": {
                        "Cost": {
                            "Food": 750,
                            "Gold": 1000
                        },
                        "ID": 45,
                        "LanguageHelpId": 28045,
                        "LanguageNameId": 7045,
                        "ResearchTime": 60,
                        "internal_name": "Faith"
                    },
                    "47": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 200
                        },
                        "ID": 47,
                        "LanguageHelpId": 28047,
                        "LanguageNameId": 7047,
                        "ResearchTime": 100,
                        "internal_name": "Chemistry"
                    },
                    "48": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 200
                        },
                        "ID": 48,
                        "LanguageHelpId": 28410,
                        "LanguageNameId": 7410,
                        "ResearchTime": 40,
                        "internal_name": "Caravan"
                    },
                    "49": {
                        "Cost": {
                            "Food": 850,
                            "Gold": 400
                        },
                        "ID": 49,
                        "LanguageHelpId": 28431,
                        "LanguageNameId": 7431,
                        "ResearchTime": 40,
                        "internal_name": "Viking Berserkergang"
                    },
                    "50": {
                        "Cost": {
                            "Food": 150,
                            "Wood": 175
                        },
                        "ID": 50,
                        "LanguageHelpId": 28050,
                        "LanguageNameId": 7050,
                        "ResearchTime": 50,
                        "internal_name": "Masonry"
                    },
                    "51": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 200
                        },
                        "ID": 51,
                        "LanguageHelpId": 28051,
                        "LanguageNameId": 7051,
                        "ResearchTime": 70,
                        "internal_name": "Architecture"
                    },
                    "52": {
                        "Cost": {
                            "Gold": 750,
                            "Wood": 750
                        },
                        "ID": 52,
                        "LanguageHelpId": 28432,
                        "LanguageNameId": 7432,
                        "ResearchTime": 60,
                        "internal_name": "Chinese Rocketry"
                    },
                    "54": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 200
                        },
                        "ID": 54,
                        "LanguageHelpId": 28054,
                        "LanguageNameId": 7054,
                        "ResearchTime": 50,
                        "internal_name": "Stone cutting"
                    },
                    "55": {
                        "Cost": {
                            "Food": 100,
                            "Wood": 75
                        },
                        "ID": 55,
                        "LanguageHelpId": 28055,
                        "LanguageNameId": 7055,
                        "ResearchTime": 30,
                        "internal_name": "Gold Mining"
                    },
                    "59": {
                        "Cost": {
                            "Gold": 400,
                            "Wood": 750
                        },
                        "ID": 59,
                        "LanguageHelpId": 28059,
                        "LanguageNameId": 7059,
                        "ResearchTime": 60,
                        "internal_name": "Japanese Kataparuto"
                    },
                    "61": {
                        "Cost": {
                            "Food": 800,
                            "Gold": 600
                        },
                        "ID": 61,
                        "LanguageHelpId": 28318,
                        "LanguageNameId": 7318,
                        "ResearchTime": 50,
                        "internal_name": "Byzantine Logistica"
                    },
                    "63": {
                        "Cost": {
                            "Food": 500,
                            "Wood": 350
                        },
                        "ID": 63,
                        "LanguageHelpId": 28063,
                        "LanguageNameId": 7063,
                        "ResearchTime": 75,
                        "internal_name": "Keep"
                    },
                    "64": {
                        "Cost": {
                            "Food": 800,
                            "Wood": 400
                        },
                        "ID": 64,
                        "LanguageHelpId": 28320,
                        "LanguageNameId": 7320,
                        "ResearchTime": 60,
                        "internal_name": "Bombard Tower"
                    },
                    "65": {
                        "Cost": {
                            "Food": 150,
                            "Wood": 200
                        },
                        "ID": 65,
                        "LanguageHelpId": 28314,
                        "LanguageNameId": 7314,
                        "ResearchTime": 45,
                        "internal_name": "Gillnets"
                    },
                    "67": {
                        "Cost": {
                            "Food": 150
                        },
                        "ID": 67,
                        "LanguageHelpId": 28067,
                        "LanguageNameId": 7067,
                        "ResearchTime": 50,
                        "internal_name": "Forging"
                    },
                    "68": {
                        "Cost": {
                            "Food": 220,
                            "Gold": 120
                        },
                        "ID": 68,
                        "LanguageHelpId": 28068,
                        "LanguageNameId": 7068,
                        "ResearchTime": 75,
                        "internal_name": "Iron casting"
                    },
                    "74": {
                        "Cost": {
                            "Food": 100
                        },
                        "ID": 74,
                        "LanguageHelpId": 28074,
                        "LanguageNameId": 7074,
                        "ResearchTime": 40,
                        "internal_name": "Scale Mail Armor"
                    },
                    "75": {
                        "Cost": {
                            "Food": 275,
                            "Gold": 225
                        },
                        "ID": 75,
                        "LanguageHelpId": 28075,
                        "LanguageNameId": 7075,
                        "ResearchTime": 100,
                        "internal_name": "Blast Furnace"
                    },
                    "76": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 100
                        },
                        "ID": 76,
                        "LanguageHelpId": 28076,
                        "LanguageNameId": 7076,
                        "ResearchTime": 55,
                        "internal_name": "Chain Mail Armor"
                    },
                    "77": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 150
                        },
                        "ID": 77,
                        "LanguageHelpId": 28077,
                        "LanguageNameId": 7077,
                        "ResearchTime": 70,
                        "internal_name": "Plate Mail Armor"
                    },
                    "80": {
                        "Cost": {
                            "Food": 350,
                            "Gold": 200
                        },
                        "ID": 80,
                        "LanguageHelpId": 28080,
                        "LanguageNameId": 7080,
                        "ResearchTime": 75,
                        "internal_name": "Plate Barding Armor"
                    },
                    "81": {
                        "Cost": {
                            "Food": 150
                        },
                        "ID": 81,
                        "LanguageHelpId": 28081,
                        "LanguageNameId": 7081,
                        "ResearchTime": 45,
                        "internal_name": "Scale Barding Armor"
                    },
                    "82": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 150
                        },
                        "ID": 82,
                        "LanguageHelpId": 28082,
                        "LanguageNameId": 7082,
                        "ResearchTime": 60,
                        "internal_name": "Chain Barding Armor"
                    },
                    "83": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 400
                        },
                        "ID": 83,
                        "LanguageHelpId": 28324,
                        "LanguageNameId": 7324,
                        "ResearchTime": 60,
                        "internal_name": "Frankish Bearded Axe"
                    },
                    "90": {
                        "Cost": {},
                        "ID": 90,
                        "LanguageHelpId": 28090,
                        "LanguageNameId": 7090,
                        "ResearchTime": 0,
                        "internal_name": "Tracking"
                    },
                    "93": {
                        "Cost": {
                            "Gold": 175,
                            "Wood": 300
                        },
                        "ID": 93,
                        "LanguageHelpId": 28093,
                        "LanguageNameId": 7093,
                        "ResearchTime": 60,
                        "internal_name": "Ballistics"
                    },
                    "101": {
                        "Cost": {
                            "Food": 500
                        },
                        "ID": 101,
                        "LanguageHelpId": 28101,
                        "LanguageNameId": 7101,
                        "ResearchTime": 130,
                        "internal_name": "Middle Age"
                    },
                    "102": {
                        "Cost": {
                            "Food": 800,
                            "Gold": 200
                        },
                        "ID": 102,
                        "LanguageHelpId": 28102,
                        "LanguageNameId": 7102,
                        "ResearchTime": 160,
                        "internal_name": "Feudal Age"
                    },
                    "103": {
                        "Cost": {
                            "Food": 1000,
                            "Gold": 800
                        },
                        "ID": 103,
                        "LanguageHelpId": 28103,
                        "LanguageNameId": 7103,
                        "ResearchTime": 190,
                        "internal_name": "Imperial Age"
                    },
                    "140": {
                        "Cost": {
                            "Food": 100,
                            "Wood": 250
                        },
                        "ID": 140,
                        "LanguageHelpId": 28186,
                        "LanguageNameId": 7186,
                        "ResearchTime": 30,
                        "internal_name": "Guard Tower"
                    },
                    "182": {
                        "Cost": {
                            "Food": 200,
                            "Wood": 150
                        },
                        "ID": 182,
                        "LanguageHelpId": 28180,
                        "LanguageNameId": 7180,
                        "ResearchTime": 75,
                        "internal_name": "Gold Shaft Mining"
                    },
                    "194": {
                        "Cost": {
                            "Food": 200,
                            "Wood": 100
                        },
                        "ID": 194,
                        "LanguageHelpId": 28163,
                        "LanguageNameId": 7163,
                        "ResearchTime": 50,
                        "internal_name": "Fortified Wall"
                    },
                    "199": {
                        "Cost": {
                            "Food": 100,
                            "Gold": 50
                        },
                        "ID": 199,
                        "LanguageHelpId": 28172,
                        "LanguageNameId": 7172,
                        "ResearchTime": 30,
                        "internal_name": "Fletching"
                    },
                    "200": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 100
                        },
                        "ID": 200,
                        "LanguageHelpId": 28150,
                        "LanguageNameId": 7150,
                        "ResearchTime": 35,
                        "internal_name": "Bodkin Arrow"
                    },
                    "201": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 200
                        },
                        "ID": 201,
                        "LanguageHelpId": 28151,
                        "LanguageNameId": 7151,
                        "ResearchTime": 40,
                        "internal_name": "Bracer"
                    },
                    "202": {
                        "Cost": {
                            "Food": 100,
                            "Wood": 50
                        },
                        "ID": 202,
                        "LanguageHelpId": 28189,
                        "LanguageNameId": 7189,
                        "ResearchTime": 25,
                        "internal_name": "Double Bit Axe"
                    },
                    "203": {
                        "Cost": {
                            "Food": 150,
                            "Wood": 100
                        },
                        "ID": 203,
                        "LanguageHelpId": 28190,
                        "LanguageNameId": 7190,
                        "ResearchTime": 50,
                        "internal_name": "Bow Saw"
                    },
                    "211": {
                        "Cost": {
                            "Food": 100
                        },
                        "ID": 211,
                        "LanguageHelpId": 28208,
                        "LanguageNameId": 7208,
                        "ResearchTime": 40,
                        "internal_name": "Padded Archer Armor"
                    },
                    "212": {
                        "Cost": {
                            "Food": 150,
                            "Gold": 150
                        },
                        "ID": 212,
                        "LanguageHelpId": 28209,
                        "LanguageNameId": 7209,
                        "ResearchTime": 55,
                        "internal_name": "Leather Archer Armor"
                    },
                    "213": {
                        "Cost": {
                            "Food": 175,
                            "Wood": 50
                        },
                        "ID": 213,
                        "LanguageHelpId": 28211,
                        "LanguageNameId": 7211,
                        "ResearchTime": 75,
                        "internal_name": "Wheel Barrow"
                    },
                    "215": {
                        "Cost": {
                            "Food": 100
                        },
                        "ID": 215,
                        "LanguageHelpId": 28210,
                        "LanguageNameId": 7210,
                        "ResearchTime": 40,
                        "internal_name": "Squires"
                    },
                    "219": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 250
                        },
                        "ID": 219,
                        "LanguageHelpId": 28216,
                        "LanguageNameId": 7216,
                        "ResearchTime": 70,
                        "internal_name": "Ring Archer Armor"
                    },
                    "221": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 200
                        },
                        "ID": 221,
                        "LanguageHelpId": 28231,
                        "LanguageNameId": 7231,
                        "ResearchTime": 100,
                        "internal_name": "Two Man Saw"
                    },
                    "230": {
                        "Cost": {
                            "Gold": 200
                        },
                        "ID": 230,
                        "LanguageHelpId": 28222,
                        "LanguageNameId": 7222,
                        "ResearchTime": 55,
                        "internal_name": "Block Printing"
                    },
                    "231": {
                        "Cost": {
                            "Gold": 120
                        },
                        "ID": 231,
                        "LanguageHelpId": 28221,
                        "LanguageNameId": 7221,
                        "ResearchTime": 60,
                        "internal_name": "Sanctity"
                    },
                    "233": {
                        "Cost": {
                            "Gold": 120
                        },
                        "ID": 233,
                        "LanguageHelpId": 28220,
                        "LanguageNameId": 7220,
                        "ResearchTime": 65,
                        "internal_name": "Illumination"
                    },
                    "249": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 200
                        },
                        "ID": 249,
                        "LanguageHelpId": 28246,
                        "LanguageNameId": 7246,
                        "ResearchTime": 55,
                        "internal_name": "Hand Cart"
                    },
                    "252": {
                        "Cost": {
                            "Gold": 140
                        },
                        "ID": 252,
                        "LanguageHelpId": 28249,
                        "LanguageNameId": 7249,
                        "ResearchTime": 50,
                        "internal_name": "Fervor"
                    },
                    "278": {
                        "Cost": {
                            "Food": 100,
                            "Wood": 75
                        },
                        "ID": 278,
                        "LanguageHelpId": 28276,
                        "LanguageNameId": 7276,
                        "ResearchTime": 30,
                        "internal_name": "Stone Mining"
                    },
                    "279": {
                        "Cost": {
                            "Food": 200,
                            "Wood": 150
                        },
                        "ID": 279,
                        "LanguageHelpId": 28277,
                        "LanguageNameId": 7277,
                        "ResearchTime": 75,
                        "internal_name": "Stone Shaft Mining"
                    },
                    "280": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 100
                        },
                        "ID": 280,
                        "LanguageHelpId": 28282,
                        "LanguageNameId": 7282,
                        "ResearchTime": 40,
                        "internal_name": "Town Patrol"
                    },
                    "315": {
                        "Cost": {
                            "Food": 150,
                            "Gold": 150
                        },
                        "ID": 315,
                        "LanguageHelpId": 28319,
                        "LanguageNameId": 7319,
                        "ResearchTime": 60,
                        "internal_name": "Conscription"
                    },
                    "316": {
                        "Cost": {
                            "Gold": 475
                        },
                        "ID": 316,
                        "LanguageHelpId": 28315,
                        "LanguageNameId": 7315,
                        "ResearchTime": 50,
                        "internal_name": "Redemption"
                    },
                    "319": {
                        "Cost": {
                            "Gold": 325
                        },
                        "ID": 319,
                        "LanguageHelpId": 28316,
                        "LanguageNameId": 7316,
                        "ResearchTime": 40,
                        "internal_name": "Atonement"
                    },
                    "321": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 200
                        },
                        "ID": 321,
                        "LanguageHelpId": 28322,
                        "LanguageNameId": 7322,
                        "ResearchTime": 10,
                        "internal_name": "Sappers"
                    },
                    "322": {
                        "Cost": {
                            "Food": 200,
                            "Stone": 100
                        },
                        "ID": 322,
                        "LanguageHelpId": 28321,
                        "LanguageNameId": 7321,
                        "ResearchTime": 60,
                        "internal_name": "Murder Holes"
                    },
                    "373": {
                        "Cost": {
                            "Food": 1000,
                            "Gold": 300
                        },
                        "ID": 373,
                        "LanguageHelpId": 28377,
                        "LanguageNameId": 7377,
                        "ResearchTime": 60,
                        "internal_name": "Shipwright"
                    },
                    "374": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 150
                        },
                        "ID": 374,
                        "LanguageHelpId": 28372,
                        "LanguageNameId": 7372,
                        "ResearchTime": 50,
                        "internal_name": "Careening"
                    },
                    "375": {
                        "Cost": {
                            "Food": 600,
                            "Gold": 400
                        },
                        "ID": 375,
                        "LanguageHelpId": 28373,
                        "LanguageNameId": 7373,
                        "ResearchTime": 60,
                        "internal_name": "Dry Dock"
                    },
                    "377": {
                        "Cost": {
                            "Food": 500,
                            "Wood": 600
                        },
                        "ID": 377,
                        "LanguageHelpId": 28378,
                        "LanguageNameId": 7378,
                        "ResearchTime": 45,
                        "internal_name": "Siege Engineers"
                    },
                    "379": {
                        "Cost": {
                            "Food": 400,
                            "Wood": 400
                        },
                        "ID": 379,
                        "LanguageHelpId": 28376,
                        "LanguageNameId": 7376,
                        "ResearchTime": 75,
                        "internal_name": "Hoardings"
                    },
                    "380": {
                        "Cost": {
                            "Food": 350,
                            "Gold": 100
                        },
                        "ID": 380,
                        "LanguageHelpId": 28374,
                        "LanguageNameId": 7374,
                        "ResearchTime": 30,
                        "internal_name": "Heated Shot"
                    },
                    "408": {
                        "Cost": {
                            "Gold": 200
                        },
                        "ID": 408,
                        "LanguageHelpId": 28408,
                        "LanguageNameId": 7408,
                        "ResearchTime": 1,
                        "internal_name": "Spy Technology"
                    },
                    "435": {
                        "Cost": {
                            "Food": 150,
                            "Gold": 100
                        },
                        "ID": 435,
                        "LanguageHelpId": 28409,
                        "LanguageNameId": 7409,
                        "ResearchTime": 50,
                        "internal_name": "Bloodlines"
                    },
                    "436": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 250
                        },
                        "ID": 436,
                        "LanguageHelpId": 28415,
                        "LanguageNameId": 7415,
                        "ResearchTime": 65,
                        "internal_name": "Parthian Tactics"
                    },
                    "437": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 250
                        },
                        "ID": 437,
                        "LanguageHelpId": 28411,
                        "LanguageNameId": 7411,
                        "ResearchTime": 45,
                        "internal_name": "Thumb Ring"
                    },
                    "438": {
                        "Cost": {
                            "Gold": 200
                        },
                        "ID": 438,
                        "LanguageHelpId": 28416,
                        "LanguageNameId": 7416,
                        "ResearchTime": 75,
                        "internal_name": "Theocracy"
                    },
                    "439": {
                        "Cost": {
                            "Gold": 1000
                        },
                        "ID": 439,
                        "LanguageHelpId": 28412,
                        "LanguageNameId": 7412,
                        "ResearchTime": 60,
                        "internal_name": "Heresy"
                    },
                    "440": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 250
                        },
                        "ID": 440,
                        "LanguageHelpId": 28325,
                        "LanguageNameId": 7325,
                        "ResearchTime": 60,
                        "internal_name": "Spanish Supremacy"
                    },
                    "441": {
                        "Cost": {
                            "Gold": 350
                        },
                        "ID": 441,
                        "LanguageHelpId": 28435,
                        "LanguageNameId": 7435,
                        "ResearchTime": 35,
                        "internal_name": "Herbal Medicine"
                    },
                    "445": {
                        "Cost": {
                            "Gold": 500,
                            "Wood": 800
                        },
                        "ID": 445,
                        "LanguageHelpId": 28438,
                        "LanguageNameId": 7438,
                        "ResearchTime": 60,
                        "internal_name": "Korean catapults"
                    },
                    "457": {
                        "Cost": {
                            "Gold": 600,
                            "Wood": 400
                        },
                        "ID": 457,
                        "LanguageHelpId": 28439,
                        "LanguageNameId": 7439,
                        "ResearchTime": 40,
                        "internal_name": "Gothic Perfusion"
                    },
                    "460": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 350
                        },
                        "ID": 460,
                        "LanguageHelpId": 28326,
                        "LanguageNameId": 7326,
                        "ResearchTime": 40,
                        "internal_name": "Aztec Sacrifice"
                    },
                    "461": {
                        "Cost": {
                            "Gold": 400,
                            "Wood": 800
                        },
                        "ID": 461,
                        "LanguageHelpId": 28327,
                        "LanguageNameId": 7327,
                        "ResearchTime": 40,
                        "internal_name": "Britons City Rights"
                    },
                    "462": {
                        "Cost": {
                            "Stone": 200,
                            "Wood": 400
                        },
                        "ID": 462,
                        "LanguageHelpId": 28368,
                        "LanguageNameId": 7368,
                        "ResearchTime": 40,
                        "internal_name": "Chinese Great Wall"
                    },
                    "463": {
                        "Cost": {
                            "Food": 700,
                            "Gold": 500
                        },
                        "ID": 463,
                        "LanguageHelpId": 28312,
                        "LanguageNameId": 7312,
                        "ResearchTime": 40,
                        "internal_name": "Viking Chieftains"
                    },
                    "464": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 300
                        },
                        "ID": 464,
                        "LanguageHelpId": 28313,
                        "LanguageNameId": 7313,
                        "ResearchTime": 40,
                        "internal_name": "Byzantines Greek Fire"
                    },
                    "482": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 200
                        },
                        "ID": 482,
                        "LanguageHelpId": 28369,
                        "LanguageNameId": 7369,
                        "ResearchTime": 30,
                        "internal_name": "Stronghold"
                    },
                    "483": {
                        "Cost": {
                            "Gold": 200,
                            "Wood": 300
                        },
                        "ID": 483,
                        "LanguageHelpId": 28370,
                        "LanguageNameId": 7370,
                        "ResearchTime": 40,
                        "internal_name": "Huns UT"
                    },
                    "484": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 300
                        },
                        "ID": 484,
                        "LanguageHelpId": 28371,
                        "LanguageNameId": 7371,
                        "ResearchTime": 40,
                        "internal_name": "Japanese UT"
                    },
                    "485": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 300
                        },
                        "ID": 485,
                        "LanguageHelpId": 28379,
                        "LanguageNameId": 7379,
                        "ResearchTime": 40,
                        "internal_name": "Mayans UT"
                    },
                    "486": {
                        "Cost": {
                            "Food": 300,
                            "Wood": 300
                        },
                        "ID": 486,
                        "LanguageHelpId": 28380,
                        "LanguageNameId": 7380,
                        "ResearchTime": 40,
                        "internal_name": "Koreans UT"
                    },
                    "487": {
                        "Cost": {
                            "Gold": 150,
                            "Wood": 300
                        },
                        "ID": 487,
                        "LanguageHelpId": 28280,
                        "LanguageNameId": 7280,
                        "ResearchTime": 40,
                        "internal_name": "Mongols UT"
                    },
                    "488": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 300
                        },
                        "ID": 488,
                        "LanguageHelpId": 28281,
                        "LanguageNameId": 7281,
                        "ResearchTime": 40,
                        "internal_name": "Persians UT"
                    },
                    "489": {
                        "Cost": {
                            "Gold": 350,
                            "Wood": 400
                        },
                        "ID": 489,
                        "LanguageHelpId": 28283,
                        "LanguageNameId": 7283,
                        "ResearchTime": 60,
                        "internal_name": "Teutons UT"
                    },
                    "490": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 100
                        },
                        "ID": 490,
                        "LanguageHelpId": 28284,
                        "LanguageNameId": 7284,
                        "ResearchTime": 30,
                        "internal_name": "Saracens UT"
                    },
                    "491": {
                        "Cost": {
                            "Food": 350,
                            "Gold": 150
                        },
                        "ID": 491,
                        "LanguageHelpId": 28285,
                        "LanguageNameId": 7285,
                        "ResearchTime": 60,
                        "internal_name": "Sipahi"
                    },
                    "492": {
                        "Cost": {
                            "Food": 100,
                            "Gold": 300
                        },
                        "ID": 492,
                        "LanguageHelpId": 28286,
                        "LanguageNameId": 7286,
                        "ResearchTime": 40,
                        "internal_name": "Spanish UT"
                    },
                    "493": {
                        "Cost": {
                            "Gold": 400,
                            "Wood": 400
                        },
                        "ID": 493,
                        "LanguageHelpId": 28287,
                        "LanguageNameId": 7287,
                        "ResearchTime": 40,
                        "internal_name": "Franks UT"
                    },
                    "494": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 150
                        },
                        "ID": 494,
                        "LanguageHelpId": 28272,
                        "LanguageNameId": 7272,
                        "ResearchTime": 40,
                        "internal_name": "Pavise"
                    },
                    "499": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 250
                        },
                        "ID": 499,
                        "LanguageHelpId": 28273,
                        "LanguageNameId": 7273,
                        "ResearchTime": 60,
                        "internal_name": "Silk Route"
                    },
                    "506": {
                        "Cost": {
                            "Food": 400,
                            "Wood": 400
                        },
                        "ID": 506,
                        "LanguageHelpId": 28270,
                        "LanguageNameId": 7270,
                        "ResearchTime": 40,
                        "internal_name": "Indians UT"
                    },
                    "507": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 300
                        },
                        "ID": 507,
                        "LanguageHelpId": 28271,
                        "LanguageNameId": 7271,
                        "ResearchTime": 40,
                        "internal_name": "Indians UT2"
                    },
                    "512": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 300
                        },
                        "ID": 512,
                        "LanguageHelpId": 28268,
                        "LanguageNameId": 7268,
                        "ResearchTime": 40,
                        "internal_name": "Slavs UT"
                    },
                    "513": {
                        "Cost": {
                            "Food": 1200,
                            "Gold": 500
                        },
                        "ID": 513,
                        "LanguageHelpId": 28269,
                        "LanguageNameId": 7269,
                        "ResearchTime": 40,
                        "internal_name": "Slavs UT"
                    },
                    "514": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 300
                        },
                        "ID": 514,
                        "LanguageHelpId": 28275,
                        "LanguageNameId": 7275,
                        "ResearchTime": 40,
                        "internal_name": "Magyars UT"
                    },
                    "515": {
                        "Cost": {
                            "Gold": 400,
                            "Wood": 600
                        },
                        "ID": 515,
                        "LanguageHelpId": 28274,
                        "LanguageNameId": 7274,
                        "ResearchTime": 40,
                        "internal_name": "Indians UT"
                    },
                    "516": {
                        "Cost": {
                            "Food": 200,
                            "Gold": 300
                        },
                        "ID": 516,
                        "LanguageHelpId": 28266,
                        "LanguageNameId": 7266,
                        "ResearchTime": 40,
                        "internal_name": "Incas UT"
                    },
                    "517": {
                        "Cost": {
                            "Food": 600,
                            "Gold": 600
                        },
                        "ID": 517,
                        "LanguageHelpId": 28267,
                        "LanguageNameId": 7267,
                        "ResearchTime": 40,
                        "internal_name": "Indians UT"
                    },
                    "572": {
                        "Cost": {
                            "Gold": 300,
                            "Wood": 200
                        },
                        "ID": 572,
                        "LanguageHelpId": 28250,
                        "LanguageNameId": 7250,
                        "ResearchTime": 40,
                        "internal_name": "Portuguese UT"
                    },
                    "573": {
                        "Cost": {
                            "Food": 700,
                            "Gold": 400
                        },
                        "ID": 573,
                        "LanguageHelpId": 28251,
                        "LanguageNameId": 7251,
                        "ResearchTime": 40,
                        "internal_name": "Portuguese UT"
                    },
                    "574": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 300
                        },
                        "ID": 574,
                        "LanguageHelpId": 28252,
                        "LanguageNameId": 7252,
                        "ResearchTime": 40,
                        "internal_name": "Ethiopian UT"
                    },
                    "575": {
                        "Cost": {
                            "Food": 1000,
                            "Gold": 600
                        },
                        "ID": 575,
                        "LanguageHelpId": 28253,
                        "LanguageNameId": 7253,
                        "ResearchTime": 40,
                        "internal_name": "Ethiopian UT"
                    },
                    "576": {
                        "Cost": {
                            "Food": 200,
                            "Wood": 300
                        },
                        "ID": 576,
                        "LanguageHelpId": 28254,
                        "LanguageNameId": 7254,
                        "ResearchTime": 40,
                        "internal_name": "Malian UT"
                    },
                    "577": {
                        "Cost": {
                            "Food": 650,
                            "Gold": 400
                        },
                        "ID": 577,
                        "LanguageHelpId": 28255,
                        "LanguageNameId": 7255,
                        "ResearchTime": 40,
                        "internal_name": "Malian UT"
                    },
                    "578": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 250
                        },
                        "ID": 578,
                        "LanguageHelpId": 28256,
                        "LanguageNameId": 7256,
                        "ResearchTime": 40,
                        "internal_name": "Berber UT"
                    },
                    "579": {
                        "Cost": {
                            "Food": 700,
                            "Gold": 300
                        },
                        "ID": 579,
                        "LanguageHelpId": 28257,
                        "LanguageNameId": 7257,
                        "ResearchTime": 40,
                        "internal_name": "Berber UT"
                    },
                    "602": {
                        "Cost": {
                            "Food": 150,
                            "Gold": 50
                        },
                        "ID": 602,
                        "LanguageHelpId": 28258,
                        "LanguageNameId": 7258,
                        "ResearchTime": 25,
                        "internal_name": "Arson"
                    },
                    "608": {
                        "Cost": {
                            "Food": 250,
                            "Wood": 250
                        },
                        "ID": 608,
                        "LanguageHelpId": 28278,
                        "LanguageNameId": 7278,
                        "ResearchTime": 25,
                        "internal_name": "Arrowslits"
                    },
                    "622": {
                        "Cost": {
                            "Gold": 450,
                            "Wood": 300
                        },
                        "ID": 622,
                        "LanguageHelpId": 28291,
                        "LanguageNameId": 7291,
                        "ResearchTime": 40,
                        "internal_name": "Khmer UT"
                    },
                    "623": {
                        "Cost": {
                            "Food": 700,
                            "Gold": 400
                        },
                        "ID": 623,
                        "LanguageHelpId": 28292,
                        "LanguageNameId": 7292,
                        "ResearchTime": 40,
                        "internal_name": "Khmer UT"
                    },
                    "624": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 300
                        },
                        "ID": 624,
                        "LanguageHelpId": 28293,
                        "LanguageNameId": 7293,
                        "ResearchTime": 40,
                        "internal_name": "Malay UT"
                    },
                    "625": {
                        "Cost": {
                            "Food": 850,
                            "Gold": 500
                        },
                        "ID": 625,
                        "LanguageHelpId": 28294,
                        "LanguageNameId": 7294,
                        "ResearchTime": 40,
                        "internal_name": "Malay UT"
                    },
                    "626": {
                        "Cost": {
                            "Food": 400,
                            "Wood": 300
                        },
                        "ID": 626,
                        "LanguageHelpId": 28295,
                        "LanguageNameId": 7295,
                        "ResearchTime": 40,
                        "internal_name": "Burmese UT"
                    },
                    "627": {
                        "Cost": {
                            "Food": 650,
                            "Gold": 400
                        },
                        "ID": 627,
                        "LanguageHelpId": 28296,
                        "LanguageNameId": 7296,
                        "ResearchTime": 40,
                        "internal_name": "Burmese UT"
                    },
                    "628": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 250
                        },
                        "ID": 628,
                        "LanguageHelpId": 28297,
                        "LanguageNameId": 7297,
                        "ResearchTime": 40,
                        "internal_name": "Vietnamese UT"
                    },
                    "629": {
                        "Cost": {
                            "Food": 500,
                            "Wood": 300
                        },
                        "ID": 629,
                        "LanguageHelpId": 28298,
                        "LanguageNameId": 7298,
                        "ResearchTime": 60,
                        "internal_name": "Vietnamese UT"
                    },
                    "685": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 200
                        },
                        "ID": 685,
                        "LanguageHelpId": 28307,
                        "LanguageNameId": 7307,
                        "ResearchTime": 35,
                        "internal_name": "Khmer UT"
                    },
                    "686": {
                        "Cost": {
                            "Food": 900,
                            "Gold": 450
                        },
                        "ID": 686,
                        "LanguageHelpId": 28308,
                        "LanguageNameId": 7308,
                        "ResearchTime": 40,
                        "internal_name": "Khmer UT"
                    },
                    "687": {
                        "Cost": {
                            "Gold": 300,
                            "Wood": 400
                        },
                        "ID": 687,
                        "LanguageHelpId": 28309,
                        "LanguageNameId": 7309,
                        "ResearchTime": 40,
                        "internal_name": "Malay UT"
                    },
                    "688": {
                        "Cost": {
                            "Gold": 400,
                            "Wood": 500
                        },
                        "ID": 688,
                        "LanguageHelpId": 28310,
                        "LanguageNameId": 7310,
                        "ResearchTime": 50,
                        "internal_name": "Malay UT"
                    },
                    "689": {
                        "Cost": {
                            "Food": 200,
                            "Wood": 300
                        },
                        "ID": 689,
                        "LanguageHelpId": 28311,
                        "LanguageNameId": 7311,
                        "ResearchTime": 40,
                        "internal_name": "Burmese UT"
                    },
                    "690": {
                        "Cost": {
                            "Food": 650,
                            "Gold": 400
                        },
                        "ID": 690,
                        "LanguageHelpId": 28398,
                        "LanguageNameId": 7398,
                        "ResearchTime": 40,
                        "internal_name": "Burmese UT"
                    },
                    "691": {
                        "Cost": {
                            "Food": 250,
                            "Gold": 250
                        },
                        "ID": 691,
                        "LanguageHelpId": 28399,
                        "LanguageNameId": 7399,
                        "ResearchTime": 40,
                        "internal_name": "Vietnamese UT"
                    },
                    "692": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 200
                        },
                        "ID": 692,
                        "LanguageHelpId": 28400,
                        "LanguageNameId": 7400,
                        "ResearchTime": 40,
                        "internal_name": "Vietnamese UT"
                    },
                    "716": {
                        "Cost": {
                            "Food": 150,
                            "Gold": 100
                        },
                        "ID": 716,
                        "LanguageHelpId": 28403,
                        "LanguageNameId": 7403,
                        "ResearchTime": 35,
                        "internal_name": "Tracking"
                    },
                    "754": {
                        "Cost": {
                            "Food": 400,
                            "Gold": 300
                        },
                        "ID": 754,
                        "LanguageHelpId": 28342,
                        "LanguageNameId": 7342,
                        "ResearchTime": 45,
                        "internal_name": "Burgundian Vineyards"
                    },
                    "755": {
                        "Cost": {
                            "Food": 800,
                            "Gold": 450
                        },
                        "ID": 755,
                        "LanguageHelpId": 28343,
                        "LanguageNameId": 7343,
                        "ResearchTime": 10,
                        "internal_name": "Flemish Revolution"
                    },
                    "756": {
                        "Cost": {
                            "Food": 300,
                            "Gold": 600
                        },
                        "ID": 756,
                        "LanguageHelpId": 28344,
                        "LanguageNameId": 7344,
                        "ResearchTime": 60,
                        "internal_name": "First Crusade"
                    },
                    "757": {
                        "Cost": {
                            "Food": 500,
                            "Gold": 400
                        },
                        "ID": 757,
                        "LanguageHelpId": 28345,
                        "LanguageNameId": 7345,
                        "ResearchTime": 45,
                        "internal_name": "Scutage"
                    }
                },
                "units": {
                    "4": {
                        "AccuracyPercent": 80,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.35,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 25
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 4,
                        "LanguageHelpId": 26083,
                        "LanguageNameId": 5083,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 35,
                        "internal_name": "ARCHR"
                    },
                    "5": {
                        "AccuracyPercent": 65,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 17,
                        "AttackDelaySeconds": 0.35,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 10,
                                "Class": 1
                            },
                            {
                                "Amount": 17,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 45,
                            "Gold": 50
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 5,
                        "LanguageHelpId": 26086,
                        "LanguageNameId": 5086,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3.45,
                        "Speed": 0.96,
                        "TrainTime": 34,
                        "internal_name": "HCANR"
                    },
                    "6": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.5066666666666667,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 28
                            },
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 15
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 25,
                            "Wood": 35
                        },
                        "FrameDelay": 19,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 6,
                        "LanguageHelpId": 26087,
                        "LanguageNameId": 5087,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 4,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 0.96,
                        "TrainTime": 22,
                        "internal_name": "HXBOW"
                    },
                    "7": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 2,
                        "AttackDelaySeconds": 0.5066666666666667,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 3,
                                "Class": 15
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 25,
                            "Wood": 35
                        },
                        "FrameDelay": 19,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 7,
                        "LanguageHelpId": 26088,
                        "LanguageNameId": 5088,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 3,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 0.96,
                        "TrainTime": 22,
                        "internal_name": "XBOWM"
                    },
                    "8": {
                        "AccuracyPercent": 70,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 40,
                            "Wood": 35
                        },
                        "FrameDelay": 10,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 8,
                        "LanguageHelpId": 26107,
                        "LanguageNameId": 5107,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 18,
                        "internal_name": "LNGBW"
                    },
                    "11": {
                        "AccuracyPercent": 95,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.49833333333333335,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 3,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 65,
                            "Wood": 55
                        },
                        "FrameDelay": 23,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 11,
                        "LanguageHelpId": 26108,
                        "LanguageNameId": 5108,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2.1,
                        "Speed": 1.45,
                        "TrainTime": 26,
                        "internal_name": "MOSUN"
                    },
                    "13": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 34
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 13,
                        "LanguageHelpId": 26090,
                        "LanguageNameId": 5090,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 0,
                        "Speed": 1.26,
                        "TrainTime": 40,
                        "internal_name": "FSHSP"
                    },
                    "17": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 17,
                        "LanguageHelpId": 26089,
                        "LanguageNameId": 5089,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 0,
                        "Speed": 1.32,
                        "TrainTime": 36,
                        "internal_name": "COGXX"
                    },
                    "21": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 11
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 30,
                            "Wood": 90
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 135,
                        "ID": 21,
                        "LanguageHelpId": 26091,
                        "LanguageNameId": 5091,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.43,
                        "TrainTime": 36,
                        "internal_name": "GALLY"
                    },
                    "24": {
                        "AccuracyPercent": 85,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.35,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 25
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 24,
                        "LanguageHelpId": 26084,
                        "LanguageNameId": 5084,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 27,
                        "internal_name": "CARCH"
                    },
                    "25": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 5,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 85,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 25,
                        "LanguageHelpId": 26112,
                        "LanguageNameId": 5112,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 5,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.8,
                        "TrainTime": 12,
                        "internal_name": "TKNIT"
                    },
                    "36": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 40,
                        "AttackDelaySeconds": 0.21,
                        "Attacks": [
                            {
                                "Amount": 200,
                                "Class": 11
                            },
                            {
                                "Amount": 40,
                                "Class": 16
                            },
                            {
                                "Amount": 40,
                                "Class": 4
                            },
                            {
                                "Amount": 20,
                                "Class": 20
                            },
                            {
                                "Amount": 40,
                                "Class": 13
                            },
                            {
                                "Amount": 40,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 225,
                            "Wood": 225
                        },
                        "FrameDelay": 7,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 36,
                        "LanguageHelpId": 26093,
                        "LanguageNameId": 5093,
                        "LineOfSight": 14,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 5,
                        "PierceArmor": 5,
                        "Range": 12,
                        "RechargeRate": 0,
                        "ReloadTime": 6.5,
                        "Speed": 0.7,
                        "TrainTime": 56,
                        "internal_name": "BCANN"
                    },
                    "38": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 38,
                        "LanguageHelpId": 26068,
                        "LanguageNameId": 5068,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.35,
                        "TrainTime": 30,
                        "internal_name": "KNGHT"
                    },
                    "39": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.8944444444444445,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 40
                        },
                        "FrameDelay": 35,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 39,
                        "LanguageHelpId": 26085,
                        "LanguageNameId": 5085,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 34,
                        "internal_name": "CVRCH"
                    },
                    "40": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 1
                            },
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 110,
                        "ID": 40,
                        "LanguageHelpId": 26101,
                        "LanguageNameId": 5101,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.35,
                        "TrainTime": 20,
                        "internal_name": "CATAP"
                    },
                    "41": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 80,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 41,
                        "LanguageHelpId": 26104,
                        "LanguageNameId": 5104,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.05,
                        "TrainTime": 16,
                        "internal_name": "GBRSK"
                    },
                    "42": {
                        "AccuracyPercent": 15,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 150,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 200,
                        "AttackDelaySeconds": 0.8800000000000001,
                        "Attacks": [
                            {
                                "Amount": 250,
                                "Class": 11
                            },
                            {
                                "Amount": 200,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 200,
                            "Wood": 200
                        },
                        "FrameDelay": 24,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 42,
                        "LanguageHelpId": 26097,
                        "LanguageNameId": 5097,
                        "LineOfSight": 19,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 4,
                        "PierceArmor": 150,
                        "Range": 16,
                        "RechargeRate": 0,
                        "ReloadTime": 10,
                        "Speed": 0,
                        "TrainTime": 50,
                        "internal_name": "TREBU"
                    },
                    "46": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 17,
                        "AttackDelaySeconds": 0.4,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 17,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 55
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 46,
                        "LanguageHelpId": 26105,
                        "LanguageNameId": 5105,
                        "LineOfSight": 10,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 8,
                        "RechargeRate": 0,
                        "ReloadTime": 3.45,
                        "Speed": 0.96,
                        "TrainTime": 21,
                        "internal_name": "JANNI"
                    },
                    "73": {
                        "AccuracyPercent": 85,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.22166666666666665,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 35,
                            "Wood": 40
                        },
                        "FrameDelay": 19,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 73,
                        "LanguageHelpId": 26102,
                        "LanguageNameId": 5102,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 0.96,
                        "TrainTime": 16,
                        "internal_name": "CHUKN"
                    },
                    "74": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 74,
                        "LanguageHelpId": 26079,
                        "LanguageNameId": 5079,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 21,
                        "internal_name": "SPRMN"
                    },
                    "75": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 75,
                        "LanguageHelpId": 26080,
                        "LanguageNameId": 5080,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 21,
                        "internal_name": "SWDMN"
                    },
                    "77": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 77,
                        "LanguageHelpId": 26081,
                        "LanguageNameId": 5081,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 21,
                        "internal_name": "THSWD"
                    },
                    "83": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 14
                            }
                        ],
                        "Cost": {
                            "Food": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 25,
                        "ID": 83,
                        "LanguageHelpId": 26121,
                        "LanguageNameId": 5606,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "VMBAS"
                    },
                    "93": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 15,
                                "Class": 5
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 15,
                                "Class": 8
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 12,
                                "Class": 30
                            },
                            {
                                "Amount": 4,
                                "Class": 35
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 35,
                            "Wood": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 93,
                        "LanguageHelpId": 26078,
                        "LanguageNameId": 5078,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1,
                        "TrainTime": 22,
                        "internal_name": "PKEMN"
                    },
                    "125": {
                        "AccuracyPercent": 25,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 25
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 125,
                        "LanguageHelpId": 26099,
                        "LanguageNameId": 5099,
                        "LineOfSight": 11,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 9,
                        "RechargeRate": 0,
                        "ReloadTime": 1,
                        "Speed": 0.7,
                        "TrainTime": 51,
                        "internal_name": "MONKX"
                    },
                    "128": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 128,
                        "LanguageHelpId": 26100,
                        "LanguageNameId": 19052,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 0,
                        "Speed": 1,
                        "TrainTime": 51,
                        "internal_name": "TCART"
                    },
                    "185": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.795872,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 17
                            },
                            {
                                "Amount": 10,
                                "Class": 1
                            },
                            {
                                "Amount": 10,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Food": 30,
                            "Gold": 40
                        },
                        "FrameDelay": 14,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 185,
                        "LanguageHelpId": 26690,
                        "LanguageNameId": 5690,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 0,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 25,
                        "internal_name": "SLINGR"
                    },
                    "207": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 18,
                                "Class": 8
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 9,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 35
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 60
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 1,
                        "HP": 140,
                        "ID": 207,
                        "LanguageHelpId": 26419,
                        "LanguageNameId": 5419,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.45,
                        "TrainTime": 20,
                        "internal_name": "SHCLRY"
                    },
                    "232": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            }
                        ],
                        "Cost": {
                            "Food": 65,
                            "Gold": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 65,
                        "ID": 232,
                        "LanguageHelpId": 26113,
                        "LanguageNameId": 5113,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 10,
                        "internal_name": "WBRSK"
                    },
                    "239": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 15,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 11
                            },
                            {
                                "Amount": 15,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 200,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 450,
                        "ID": 239,
                        "LanguageHelpId": 26109,
                        "LanguageNameId": 5109,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.6,
                        "TrainTime": 31,
                        "internal_name": "MPCAV"
                    },
                    "250": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 11
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 130,
                        "ID": 250,
                        "LanguageHelpId": 26106,
                        "LanguageNameId": 5106,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.54,
                        "TrainTime": 25,
                        "internal_name": "LNGBT"
                    },
                    "279": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.21,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 11
                            },
                            {
                                "Amount": 6,
                                "Class": 5
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 75,
                            "Wood": 75
                        },
                        "FrameDelay": 42,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 279,
                        "LanguageHelpId": 26096,
                        "LanguageNameId": 5096,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 2,
                        "PierceArmor": 7,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3.6,
                        "Speed": 0.65,
                        "TrainTime": 30,
                        "internal_name": "SCBAL"
                    },
                    "280": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 40,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 35,
                                "Class": 11
                            },
                            {
                                "Amount": 40,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 135,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 280,
                        "LanguageHelpId": 26095,
                        "LanguageNameId": 5095,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 3,
                        "PierceArmor": 6,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 6,
                        "Speed": 0.6,
                        "TrainTime": 46,
                        "internal_name": "MANGO"
                    },
                    "281": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.9955555555555556,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 25
                        },
                        "FrameDelay": 28,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 281,
                        "LanguageHelpId": 26111,
                        "LanguageNameId": 5111,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 3,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 17,
                        "internal_name": "TAXEM"
                    },
                    "282": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 35
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.4,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 9,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 85
                        },
                        "FrameDelay": 24,
                        "GarrisonCapacity": 0,
                        "HP": 65,
                        "ID": 282,
                        "LanguageHelpId": 26103,
                        "LanguageNameId": 5103,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 3,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 23,
                        "internal_name": "DERVI"
                    },
                    "283": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 283,
                        "LanguageHelpId": 26070,
                        "LanguageNameId": 5070,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.35,
                        "TrainTime": 30,
                        "internal_name": "PALDN"
                    },
                    "291": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 19
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 291,
                        "LanguageHelpId": 26110,
                        "LanguageNameId": 5110,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1,
                        "TrainTime": 9,
                        "internal_name": "SMURI"
                    },
                    "329": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 4
                            },
                            {
                                "Amount": 9,
                                "Class": 8
                            },
                            {
                                "Amount": 5,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 5,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 60
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 1,
                        "HP": 100,
                        "ID": 329,
                        "LanguageHelpId": 26416,
                        "LanguageNameId": 5416,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.45,
                        "TrainTime": 22,
                        "internal_name": "CVLRY"
                    },
                    "330": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 18,
                                "Class": 8
                            },
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 9,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 35
                            },
                            {
                                "Amount": 9,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 60
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 1,
                        "HP": 120,
                        "ID": 330,
                        "LanguageHelpId": 26417,
                        "LanguageNameId": 5417,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.45,
                        "TrainTime": 22,
                        "internal_name": "HCLRY"
                    },
                    "331": {
                        "AccuracyPercent": 92,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 200,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 250,
                                "Class": 11
                            },
                            {
                                "Amount": 200,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 200,
                            "Wood": 200
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 331,
                        "LanguageHelpId": 26381,
                        "LanguageNameId": 5097,
                        "LineOfSight": 19,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 4,
                        "PierceArmor": 8,
                        "Range": 16,
                        "RechargeRate": 0,
                        "ReloadTime": 10,
                        "Speed": 0.8,
                        "TrainTime": 50,
                        "internal_name": "PTREB"
                    },
                    "358": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 25,
                                "Class": 5
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 22,
                                "Class": 8
                            },
                            {
                                "Amount": 16,
                                "Class": 16
                            },
                            {
                                "Amount": 18,
                                "Class": 30
                            },
                            {
                                "Amount": 11,
                                "Class": 35
                            },
                            {
                                "Amount": 16,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 35,
                            "Wood": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 358,
                        "LanguageHelpId": 26408,
                        "LanguageNameId": 5408,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1,
                        "TrainTime": 22,
                        "internal_name": "ISPKM"
                    },
                    "359": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 28,
                                "Class": 5
                            },
                            {
                                "Amount": 6,
                                "Class": 4
                            },
                            {
                                "Amount": 32,
                                "Class": 8
                            },
                            {
                                "Amount": 17,
                                "Class": 16
                            },
                            {
                                "Amount": 26,
                                "Class": 30
                            },
                            {
                                "Amount": 11,
                                "Class": 35
                            },
                            {
                                "Amount": 17,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 35,
                            "Wood": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 359,
                        "LanguageHelpId": 26409,
                        "LanguageNameId": 5409,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1,
                        "TrainTime": 22,
                        "internal_name": "HLBDM"
                    },
                    "420": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 35,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 200,
                                "Class": 11
                            },
                            {
                                "Amount": 15,
                                "Class": 1
                            },
                            {
                                "Amount": 35,
                                "Class": 4
                            },
                            {
                                "Amount": 15,
                                "Class": 15
                            },
                            {
                                "Amount": 15,
                                "Class": 8
                            },
                            {
                                "Amount": 40,
                                "Class": 20
                            },
                            {
                                "Amount": 4,
                                "Class": 35
                            }
                        ],
                        "Cost": {
                            "Gold": 150,
                            "Wood": 200
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 420,
                        "LanguageHelpId": 26287,
                        "LanguageNameId": 5287,
                        "LineOfSight": 15,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 3,
                        "PierceArmor": 6,
                        "Range": 13,
                        "RechargeRate": 0,
                        "ReloadTime": 10,
                        "Speed": 1.1,
                        "TrainTime": 46,
                        "internal_name": "CANGA"
                    },
                    "422": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": -3,
                                "Class": 4
                            },
                            {
                                "Amount": 190,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 150,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 50,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 75,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 5,
                        "HP": 200,
                        "ID": 422,
                        "LanguageHelpId": 26289,
                        "LanguageNameId": 5289,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 190,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 0.5,
                        "TrainTime": 36,
                        "internal_name": "CBATR"
                    },
                    "440": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 25,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 100,
                                "Class": 26
                            },
                            {
                                "Amount": 500,
                                "Class": 11
                            },
                            {
                                "Amount": 25,
                                "Class": 4
                            },
                            {
                                "Amount": 60,
                                "Class": 20
                            },
                            {
                                "Amount": 900,
                                "Class": 22
                            }
                        ],
                        "Cost": {
                            "Food": 65,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 440,
                        "LanguageHelpId": 26660,
                        "LanguageNameId": 5660,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "PETARD"
                    },
                    "441": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 25
                            },
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 80
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 75,
                        "ID": 441,
                        "LanguageHelpId": 26661,
                        "LanguageNameId": 5661,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.5,
                        "TrainTime": 30,
                        "internal_name": "HUSSAR"
                    },
                    "442": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 11,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 11,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 30,
                            "Wood": 90
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 165,
                        "ID": 442,
                        "LanguageHelpId": 26309,
                        "LanguageNameId": 5309,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.43,
                        "TrainTime": 36,
                        "internal_name": "WARGA"
                    },
                    "448": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 25
                            },
                            {
                                "Amount": 3,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 80
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 448,
                        "LanguageHelpId": 26326,
                        "LanguageNameId": 5326,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 30,
                        "internal_name": "SCOUT"
                    },
                    "473": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 473,
                        "LanguageHelpId": 26411,
                        "LanguageNameId": 5411,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 21,
                        "internal_name": "HTHSW"
                    },
                    "474": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.8816666666666666,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 40
                        },
                        "FrameDelay": 46,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 474,
                        "LanguageHelpId": 26412,
                        "LanguageNameId": 5412,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 27,
                        "internal_name": "HCVAR"
                    },
                    "492": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.3422222222222222,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 13
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 25
                        },
                        "FrameDelay": 20,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 492,
                        "LanguageHelpId": 26418,
                        "LanguageNameId": 5418,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 27,
                        "internal_name": "ACOAR"
                    },
                    "527": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 3,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 110,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 220,
                                "Class": 11
                            },
                            {
                                "Amount": 110,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 527,
                        "LanguageHelpId": 26424,
                        "LanguageNameId": 5424,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 1.6,
                        "TrainTime": 31,
                        "internal_name": "RMSHP"
                    },
                    "528": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 5,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 140,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 280,
                                "Class": 11
                            },
                            {
                                "Amount": 140,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 528,
                        "LanguageHelpId": 26425,
                        "LanguageNameId": 5425,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 5,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 1.6,
                        "TrainTime": 31,
                        "internal_name": "CRMSH"
                    },
                    "529": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 6,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 2,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 16
                            },
                            {
                                "Amount": 2,
                                "Class": 2
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 529,
                        "LanguageHelpId": 26426,
                        "LanguageNameId": 5426,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 2.49,
                        "RechargeRate": 0,
                        "ReloadTime": 0.25,
                        "Speed": 1.35,
                        "TrainTime": 36,
                        "internal_name": "FRGAL"
                    },
                    "530": {
                        "AccuracyPercent": 80,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 40,
                            "Wood": 35
                        },
                        "FrameDelay": 10,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 530,
                        "LanguageHelpId": 26456,
                        "LanguageNameId": 5456,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 18,
                        "internal_name": "ULGBW"
                    },
                    "531": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.8177777777777778,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 25
                        },
                        "FrameDelay": 23,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 531,
                        "LanguageHelpId": 26461,
                        "LanguageNameId": 5461,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 17,
                        "internal_name": "UTAXE"
                    },
                    "532": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 9,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 11
                            },
                            {
                                "Amount": 4,
                                "Class": 16
                            },
                            {
                                "Amount": 3,
                                "Class": 2
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 140,
                        "ID": 532,
                        "LanguageHelpId": 26429,
                        "LanguageNameId": 5429,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 2.49,
                        "RechargeRate": 0,
                        "ReloadTime": 0.25,
                        "Speed": 1.43,
                        "TrainTime": 36,
                        "internal_name": "HFGAL"
                    },
                    "533": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 11,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 11,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 160,
                        "ID": 533,
                        "LanguageHelpId": 26457,
                        "LanguageNameId": 5457,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.54,
                        "TrainTime": 25,
                        "internal_name": "ULNGB"
                    },
                    "534": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 13,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 13,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            }
                        ],
                        "Cost": {
                            "Food": 65,
                            "Gold": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 534,
                        "LanguageHelpId": 26463,
                        "LanguageNameId": 5463,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 10,
                        "internal_name": "UWBRS"
                    },
                    "539": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 16
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 17
                            },
                            {
                                "Amount": 8,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 30,
                            "Wood": 90
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 539,
                        "LanguageHelpId": 26436,
                        "LanguageNameId": 5436,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.43,
                        "TrainTime": 60,
                        "internal_name": "SGALY"
                    },
                    "542": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 16,
                        "AttackDelaySeconds": 0.20800000000000002,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 5
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 16,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 75,
                            "Wood": 75
                        },
                        "FrameDelay": 26,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 542,
                        "LanguageHelpId": 26439,
                        "LanguageNameId": 5439,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 2,
                        "PierceArmor": 7,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3.6,
                        "Speed": 0.65,
                        "TrainTime": 30,
                        "internal_name": "HWBAL"
                    },
                    "545": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Wood": 125
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 5,
                        "HP": 100,
                        "ID": 545,
                        "LanguageHelpId": 26443,
                        "LanguageNameId": 5443,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 4,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 0,
                        "Speed": 1.45,
                        "TrainTime": 46,
                        "internal_name": "XPORT"
                    },
                    "546": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 25
                            },
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 80
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 546,
                        "LanguageHelpId": 26444,
                        "LanguageNameId": 5444,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.5,
                        "TrainTime": 30,
                        "internal_name": "LTCAV"
                    },
                    "548": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": -3,
                                "Class": 4
                            },
                            {
                                "Amount": 195,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 200,
                                "Class": 11
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 65,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 75,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 6,
                        "HP": 270,
                        "ID": 548,
                        "LanguageHelpId": 26446,
                        "LanguageNameId": 5446,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 195,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 0.6,
                        "TrainTime": 36,
                        "internal_name": "SGRAM"
                    },
                    "550": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 50,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 45,
                                "Class": 11
                            },
                            {
                                "Amount": 50,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 135,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 550,
                        "LanguageHelpId": 26448,
                        "LanguageNameId": 5448,
                        "LineOfSight": 10,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 3,
                        "PierceArmor": 7,
                        "Range": 8,
                        "RechargeRate": 0,
                        "ReloadTime": 6,
                        "Speed": 0.6,
                        "TrainTime": 46,
                        "internal_name": "ONAGR"
                    },
                    "553": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 16,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 1
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 553,
                        "LanguageHelpId": 26451,
                        "LanguageNameId": 5451,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.7,
                        "Speed": 1.35,
                        "TrainTime": 20,
                        "internal_name": "UCATA"
                    },
                    "554": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 17,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 17,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 85,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 554,
                        "LanguageHelpId": 26462,
                        "LanguageNameId": 5462,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 10,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.8,
                        "TrainTime": 12,
                        "internal_name": "UTKNI"
                    },
                    "555": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 80,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 555,
                        "LanguageHelpId": 26454,
                        "LanguageNameId": 5454,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.05,
                        "TrainTime": 16,
                        "internal_name": "UGBRS"
                    },
                    "556": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 35
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.2,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 1,
                                "Class": 35
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 85
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 556,
                        "LanguageHelpId": 26453,
                        "LanguageNameId": 5453,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 3,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 23,
                        "internal_name": "UDERV"
                    },
                    "557": {
                        "AccuracyPercent": 65,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 22,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 22,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 55
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 557,
                        "LanguageHelpId": 26455,
                        "LanguageNameId": 5455,
                        "LineOfSight": 10,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 8,
                        "RechargeRate": 0,
                        "ReloadTime": 3.45,
                        "Speed": 0.96,
                        "TrainTime": 21,
                        "internal_name": "UJANI"
                    },
                    "558": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 20,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 11
                            },
                            {
                                "Amount": 20,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 200,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 600,
                        "ID": 558,
                        "LanguageHelpId": 26459,
                        "LanguageNameId": 5459,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.6,
                        "TrainTime": 31,
                        "internal_name": "UMPCAV"
                    },
                    "559": {
                        "AccuracyPercent": 85,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.22166666666666665,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 35,
                            "Wood": 40
                        },
                        "FrameDelay": 19,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 559,
                        "LanguageHelpId": 26452,
                        "LanguageNameId": 5452,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 0.96,
                        "TrainTime": 13,
                        "internal_name": "UCHUK"
                    },
                    "560": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 19
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 560,
                        "LanguageHelpId": 26460,
                        "LanguageNameId": 5460,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1,
                        "TrainTime": 9,
                        "internal_name": "USMUR"
                    },
                    "561": {
                        "AccuracyPercent": 95,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.49833333333333335,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 5,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 65,
                            "Wood": 55
                        },
                        "FrameDelay": 23,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 561,
                        "LanguageHelpId": 26458,
                        "LanguageNameId": 5458,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2.1,
                        "Speed": 1.45,
                        "TrainTime": 26,
                        "internal_name": "UMOSU"
                    },
                    "567": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 13,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 13,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 20
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 567,
                        "LanguageHelpId": 26469,
                        "LanguageNameId": 5469,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 21,
                        "internal_name": "HEROI"
                    },
                    "569": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 160,
                        "ID": 569,
                        "LanguageHelpId": 26471,
                        "LanguageNameId": 5471,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.35,
                        "TrainTime": 30,
                        "internal_name": "HEROC"
                    },
                    "588": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 75,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 60,
                                "Class": 11
                            },
                            {
                                "Amount": 75,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 135,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 588,
                        "LanguageHelpId": 26493,
                        "LanguageNameId": 5493,
                        "LineOfSight": 10,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 3,
                        "PierceArmor": 8,
                        "Range": 8,
                        "RechargeRate": 0,
                        "ReloadTime": 6,
                        "Speed": 0.6,
                        "TrainTime": 46,
                        "internal_name": "SNAGR"
                    },
                    "691": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 45,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 275,
                                "Class": 11
                            },
                            {
                                "Amount": 15,
                                "Class": 1
                            },
                            {
                                "Amount": 45,
                                "Class": 4
                            },
                            {
                                "Amount": 15,
                                "Class": 15
                            },
                            {
                                "Amount": 15,
                                "Class": 8
                            },
                            {
                                "Amount": 40,
                                "Class": 20
                            },
                            {
                                "Amount": 4,
                                "Class": 35
                            }
                        ],
                        "Cost": {
                            "Gold": 150,
                            "Wood": 200
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 691,
                        "LanguageHelpId": 26573,
                        "LanguageNameId": 5573,
                        "LineOfSight": 17,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 3,
                        "PierceArmor": 8,
                        "Range": 15,
                        "RechargeRate": 0,
                        "ReloadTime": 10,
                        "Speed": 1.1,
                        "TrainTime": 46,
                        "internal_name": "CNGAU"
                    },
                    "692": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 65,
                            "Gold": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 54,
                        "ID": 692,
                        "LanguageHelpId": 26574,
                        "LanguageNameId": 5574,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.05,
                        "TrainTime": 14,
                        "internal_name": "VBRSK"
                    },
                    "694": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 65,
                            "Gold": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 62,
                        "ID": 694,
                        "LanguageHelpId": 26576,
                        "LanguageNameId": 5576,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.05,
                        "TrainTime": 14,
                        "internal_name": "UVBRK"
                    },
                    "725": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 1
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 10,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 725,
                        "LanguageHelpId": 26667,
                        "LanguageNameId": 5667,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 12,
                        "internal_name": "JAGUAR"
                    },
                    "726": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 11,
                                "Class": 1
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 10,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 75,
                        "ID": 726,
                        "LanguageHelpId": 26669,
                        "LanguageNameId": 5669,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 12,
                        "internal_name": "JAGUARX"
                    },
                    "751": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 25
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 20,
                            "Gold": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 751,
                        "LanguageHelpId": 26672,
                        "LanguageNameId": 5672,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.1,
                        "TrainTime": 60,
                        "internal_name": "EAGLE"
                    },
                    "752": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 25
                            },
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 16
                            },
                            {
                                "Amount": 5,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 3,
                                "Class": 30
                            },
                            {
                                "Amount": 2,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 20,
                            "Gold": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 752,
                        "LanguageHelpId": 26673,
                        "LanguageNameId": 5673,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.3,
                        "TrainTime": 20,
                        "internal_name": "EAGLEX"
                    },
                    "753": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 25
                            },
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 3,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 20
                            },
                            {
                                "Amount": 1,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 2,
                                "Class": 30
                            },
                            {
                                "Amount": 1,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 20,
                            "Gold": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 753,
                        "LanguageHelpId": 26671,
                        "LanguageNameId": 5671,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.15,
                        "TrainTime": 35,
                        "internal_name": "EAGLEH"
                    },
                    "755": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 26
                            },
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 12,
                                "Class": 13
                            },
                            {
                                "Amount": 8,
                                "Class": 22
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 60
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 755,
                        "LanguageHelpId": 26675,
                        "LanguageNameId": 5675,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.1,
                        "Speed": 1.35,
                        "TrainTime": 14,
                        "internal_name": "TARKAN"
                    },
                    "757": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 26
                            },
                            {
                                "Amount": 10,
                                "Class": 11
                            },
                            {
                                "Amount": 11,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 12,
                                "Class": 13
                            },
                            {
                                "Amount": 10,
                                "Class": 22
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 60
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 757,
                        "LanguageHelpId": 26677,
                        "LanguageNameId": 5677,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.1,
                        "Speed": 1.35,
                        "TrainTime": 14,
                        "internal_name": "UTARK"
                    },
                    "763": {
                        "AccuracyPercent": 80,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 1,
                                "Class": 1
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 1,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Gold": 55,
                            "Wood": 55
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 763,
                        "LanguageHelpId": 26683,
                        "LanguageNameId": 5683,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.2,
                        "TrainTime": 16,
                        "internal_name": "PLUME"
                    },
                    "765": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 2,
                                "Class": 1
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 2,
                                "Class": 32
                            }
                        ],
                        "Cost": {
                            "Gold": 55,
                            "Wood": 55
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 65,
                        "ID": 765,
                        "LanguageHelpId": 26685,
                        "LanguageNameId": 5685,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.2,
                        "TrainTime": 16,
                        "internal_name": "UPLUM"
                    },
                    "771": {
                        "AccuracyPercent": 65,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 16,
                        "AttackDelaySeconds": 0.40444444444444444,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 16,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 13,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 771,
                        "LanguageHelpId": 26687,
                        "LanguageNameId": 5687,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 2.9,
                        "Speed": 1.3,
                        "TrainTime": 24,
                        "internal_name": "CONQI"
                    },
                    "773": {
                        "AccuracyPercent": 70,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 18,
                        "AttackDelaySeconds": 0.40444444444444444,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 11
                            },
                            {
                                "Amount": 18,
                                "Class": 3
                            },
                            {
                                "Amount": 6,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 13,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 773,
                        "LanguageHelpId": 26689,
                        "LanguageNameId": 5689,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 2.9,
                        "Speed": 1.3,
                        "TrainTime": 24,
                        "internal_name": "UCONQ"
                    },
                    "775": {
                        "AccuracyPercent": 25,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 25
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 100
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 775,
                        "LanguageHelpId": 26691,
                        "LanguageNameId": 5691,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 1,
                        "Speed": 1.1,
                        "TrainTime": 51,
                        "internal_name": "MONKY"
                    },
                    "827": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.9955555555555555,
                        "Attacks": [
                            {
                                "Amount": 5,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 115
                        },
                        "FrameDelay": 32,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 827,
                        "LanguageHelpId": 26727,
                        "LanguageNameId": 5727,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2.5,
                        "Speed": 1.2,
                        "TrainTime": 21,
                        "internal_name": "WAGON"
                    },
                    "829": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.9955555555555555,
                        "Attacks": [
                            {
                                "Amount": 5,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 115
                        },
                        "FrameDelay": 32,
                        "GarrisonCapacity": 0,
                        "HP": 200,
                        "ID": 829,
                        "LanguageHelpId": 26729,
                        "LanguageNameId": 5729,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2.5,
                        "Speed": 1.2,
                        "TrainTime": 21,
                        "internal_name": "UWAGO"
                    },
                    "831": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 8,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 2
                            },
                            {
                                "Amount": 6,
                                "Class": 4
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 50,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 50,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Gold": 180,
                            "Wood": 190
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 200,
                        "ID": 831,
                        "LanguageHelpId": 26731,
                        "LanguageNameId": 5731,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 6,
                        "MinRange": 0,
                        "PierceArmor": 5,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 6,
                        "Speed": 0.9,
                        "TrainTime": 50,
                        "internal_name": "TURTL"
                    },
                    "832": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 11,
                                "Class": 16
                            },
                            {
                                "Amount": 1,
                                "Class": 2
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 50,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 50,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Gold": 180,
                            "Wood": 190
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 300,
                        "ID": 832,
                        "LanguageHelpId": 26732,
                        "LanguageNameId": 5732,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 8,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 6,
                        "Speed": 1.035,
                        "TrainTime": 50,
                        "internal_name": "UTURT"
                    },
                    "866": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 5,
                                "Class": 8
                            },
                            {
                                "Amount": 4,
                                "Class": 16
                            },
                            {
                                "Amount": 5,
                                "Class": 5
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 30
                            },
                            {
                                "Amount": 4,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 40,
                            "Wood": 45
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 866,
                        "LanguageHelpId": 26723,
                        "LanguageNameId": 5723,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 18,
                        "internal_name": "GENOE"
                    },
                    "868": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 7,
                                "Class": 8
                            },
                            {
                                "Amount": 5,
                                "Class": 16
                            },
                            {
                                "Amount": 7,
                                "Class": 5
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 30
                            },
                            {
                                "Amount": 5,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 40,
                            "Wood": 45
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 868,
                        "LanguageHelpId": 26725,
                        "LanguageNameId": 5725,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.96,
                        "TrainTime": 14,
                        "internal_name": "GENOE_E"
                    },
                    "869": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 17
                            },
                            {
                                "Amount": 5,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 80,
                            "Gold": 10
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 869,
                        "LanguageHelpId": 26728,
                        "LanguageNameId": 5728,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.5,
                        "TrainTime": 16,
                        "internal_name": "UMAGYX"
                    },
                    "871": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            },
                            {
                                "Amount": 8,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 80,
                            "Gold": 10
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 85,
                        "ID": 871,
                        "LanguageHelpId": 26730,
                        "LanguageNameId": 5730,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.5,
                        "TrainTime": 16,
                        "internal_name": "UMAGYX"
                    },
                    "873": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": -2,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.394,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            }
                        ],
                        "Cost": {
                            "Food": 100,
                            "Gold": 70
                        },
                        "FrameDelay": 24,
                        "GarrisonCapacity": 0,
                        "HP": 280,
                        "ID": 873,
                        "LanguageHelpId": 26682,
                        "LanguageNameId": 5682,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "ELEAR"
                    },
                    "875": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": -2,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.394,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            }
                        ],
                        "Cost": {
                            "Food": 100,
                            "Gold": 70
                        },
                        "FrameDelay": 24,
                        "GarrisonCapacity": 0,
                        "HP": 330,
                        "ID": 875,
                        "LanguageHelpId": 26684,
                        "LanguageNameId": 5684,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "UELEA"
                    },
                    "876": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 80
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 876,
                        "LanguageHelpId": 26447,
                        "LanguageNameId": 5447,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 4,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.3,
                        "TrainTime": 15,
                        "internal_name": "BOYAR"
                    },
                    "878": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 6,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 80
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 130,
                        "ID": 878,
                        "LanguageHelpId": 26449,
                        "LanguageNameId": 5449,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 6,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.3,
                        "TrainTime": 15,
                        "internal_name": "EBOYA"
                    },
                    "879": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 30
                            },
                            {
                                "Amount": 20,
                                "Class": 5
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 879,
                        "LanguageHelpId": 26686,
                        "LanguageNameId": 5686,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 1,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 10,
                        "internal_name": "KAMAY"
                    },
                    "881": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 30
                            },
                            {
                                "Amount": 20,
                                "Class": 5
                            },
                            {
                                "Amount": 1,
                                "Class": 35
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 881,
                        "LanguageHelpId": 26688,
                        "LanguageNameId": 5688,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 1,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1,
                        "TrainTime": 10,
                        "internal_name": "EKAMA"
                    },
                    "882": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 10,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            },
                            {
                                "Amount": 0,
                                "Class": 32
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 10,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 35
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 882,
                        "LanguageHelpId": 26114,
                        "LanguageNameId": 5114,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.2,
                        "TrainTime": 18,
                        "internal_name": "CONDO"
                    },
                    "1001": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 16,
                        "AttackDelaySeconds": 0.6,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 16,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 70,
                            "Wood": 80
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 1001,
                        "LanguageHelpId": 26129,
                        "LanguageNameId": 5129,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 1,
                        "PierceArmor": 4,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3.45,
                        "Speed": 0.85,
                        "TrainTime": 21,
                        "internal_name": "ORGAN"
                    },
                    "1003": {
                        "AccuracyPercent": 50,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 23
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 20,
                        "AttackDelaySeconds": 0.6,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 20,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 70,
                            "Wood": 80
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 70,
                        "ID": 1003,
                        "LanguageHelpId": 26130,
                        "LanguageNameId": 5130,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 1,
                        "PierceArmor": 6,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3.45,
                        "Speed": 0.85,
                        "TrainTime": 21,
                        "internal_name": "EORGAN"
                    },
                    "1004": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 8,
                                "Class": 11
                            },
                            {
                                "Amount": 6,
                                "Class": 16
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 6,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 43,
                            "Wood": 90
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 130,
                        "ID": 1004,
                        "LanguageHelpId": 26132,
                        "LanguageNameId": 5132,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.43,
                        "TrainTime": 36,
                        "internal_name": "CARAV"
                    },
                    "1006": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 11
                            },
                            {
                                "Amount": 7,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 17
                            },
                            {
                                "Amount": 7,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 43,
                            "Wood": 90
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 150,
                        "ID": 1006,
                        "LanguageHelpId": 26133,
                        "LanguageNameId": 5133,
                        "LineOfSight": 9,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 8,
                        "Range": 7,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.43,
                        "TrainTime": 36,
                        "internal_name": "CARAV"
                    },
                    "1007": {
                        "AccuracyPercent": 95,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.625,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 4,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 50
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 1007,
                        "LanguageHelpId": 26134,
                        "LanguageNameId": 5134,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 25,
                        "internal_name": "CAMAR"
                    },
                    "1009": {
                        "AccuracyPercent": 95,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.625,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 6,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 50
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 1009,
                        "LanguageHelpId": 26136,
                        "LanguageNameId": 5136,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.4,
                        "TrainTime": 25,
                        "internal_name": "ECAMAR"
                    },
                    "1010": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 3,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 4,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 2,
                                "Class": 27
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Wood": 35
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 1010,
                        "LanguageHelpId": 26137,
                        "LanguageNameId": 5137,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 4,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.35,
                        "TrainTime": 25,
                        "internal_name": "GENITO"
                    },
                    "1012": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.5,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 5,
                                "Class": 15
                            },
                            {
                                "Amount": 2,
                                "Class": 28
                            },
                            {
                                "Amount": 2,
                                "Class": 27
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Wood": 35
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 1012,
                        "LanguageHelpId": 26139,
                        "LanguageNameId": 5139,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 4,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 1.35,
                        "TrainTime": 23,
                        "internal_name": "EGENITO"
                    },
                    "1013": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 1.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 40
                        },
                        "FrameDelay": 30,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 1013,
                        "LanguageHelpId": 26140,
                        "LanguageNameId": 5140,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.25,
                        "TrainTime": 17,
                        "internal_name": "GBETO"
                    },
                    "1015": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 13,
                        "AttackDelaySeconds": 1.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 13,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 40
                        },
                        "FrameDelay": 30,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1015,
                        "LanguageHelpId": 26141,
                        "LanguageNameId": 5141,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 6,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.25,
                        "TrainTime": 17,
                        "internal_name": "EGBETO"
                    },
                    "1016": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 16,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 16,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 1016,
                        "LanguageHelpId": 26143,
                        "LanguageNameId": 5143,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 8,
                        "internal_name": "SHOTEL"
                    },
                    "1018": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 18,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 18,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 50,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 1018,
                        "LanguageHelpId": 26145,
                        "LanguageNameId": 5145,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 8,
                        "internal_name": "ESHOTEL"
                    },
                    "1103": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": 6,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 1,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 11
                            },
                            {
                                "Amount": 3,
                                "Class": 16
                            },
                            {
                                "Amount": 1,
                                "Class": 2
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 1,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 1103,
                        "LanguageHelpId": 26160,
                        "LanguageNameId": 5160,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 2.49,
                        "RechargeRate": 0,
                        "ReloadTime": 0.25,
                        "Speed": 1.3,
                        "TrainTime": 65,
                        "internal_name": "SFRGAL"
                    },
                    "1104": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 16
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 90,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 180,
                                "Class": 11
                            },
                            {
                                "Amount": 90,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Gold": 50,
                            "Wood": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1104,
                        "LanguageHelpId": 26162,
                        "LanguageNameId": 5162,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 1.5,
                        "TrainTime": 45,
                        "internal_name": "SDGAL"
                    },
                    "1105": {
                        "AccuracyPercent": 0,
                        "Armours": [
                            {
                                "Amount": -2,
                                "Class": 4
                            },
                            {
                                "Amount": 100,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 0,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [],
                        "Cost": {
                            "Gold": 160,
                            "Wood": 200
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 10,
                        "HP": 220,
                        "ID": 1105,
                        "LanguageHelpId": 26445,
                        "LanguageNameId": 5445,
                        "LineOfSight": 8,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 100,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 0,
                        "Speed": 0.8,
                        "TrainTime": 36,
                        "internal_name": "SIEGTWR"
                    },
                    "1120": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": -2,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": -2,
                                "Class": 5
                            },
                            {
                                "Amount": -2,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.394,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 3
                            },
                            {
                                "Amount": 3,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 100,
                                "Class": 18
                            },
                            {
                                "Amount": 2,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 100,
                            "Gold": 80
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 250,
                        "ID": 1120,
                        "LanguageHelpId": 26146,
                        "LanguageNameId": 5146,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2.5,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "ELEBALI"
                    },
                    "1122": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": -2,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": -2,
                                "Class": 5
                            },
                            {
                                "Amount": -2,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.394,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 9,
                                "Class": 3
                            },
                            {
                                "Amount": 4,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 100,
                                "Class": 18
                            },
                            {
                                "Amount": 4,
                                "Class": 11
                            },
                            {
                                "Amount": 8,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 34
                            }
                        ],
                        "Cost": {
                            "Food": 100,
                            "Gold": 80
                        },
                        "FrameDelay": 12,
                        "GarrisonCapacity": 0,
                        "HP": 290,
                        "ID": 1122,
                        "LanguageHelpId": 26147,
                        "LanguageNameId": 5147,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2.5,
                        "Speed": 0.8,
                        "TrainTime": 25,
                        "internal_name": "EELEBALI"
                    },
                    "1123": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 25,
                            "Gold": 15
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 30,
                        "ID": 1123,
                        "LanguageHelpId": 26148,
                        "LanguageNameId": 5148,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 6,
                        "internal_name": "KARAM"
                    },
                    "1125": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 1,
                                "Class": 21
                            },
                            {
                                "Amount": 7,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 25,
                            "Gold": 15
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 1125,
                        "LanguageHelpId": 26150,
                        "LanguageNameId": 5150,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.2,
                        "TrainTime": 6,
                        "internal_name": "EKARAM"
                    },
                    "1126": {
                        "AccuracyPercent": 20,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.6,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 12,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 75
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 1126,
                        "LanguageHelpId": 26151,
                        "LanguageNameId": 5151,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.3,
                        "TrainTime": 21,
                        "internal_name": "ARAMBAI"
                    },
                    "1128": {
                        "AccuracyPercent": 30,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 15,
                        "AttackDelaySeconds": 0.6,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 15,
                                "Class": 3
                            },
                            {
                                "Amount": 2,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Gold": 60,
                            "Wood": 75
                        },
                        "FrameDelay": 15,
                        "GarrisonCapacity": 0,
                        "HP": 65,
                        "ID": 1128,
                        "LanguageHelpId": 26152,
                        "LanguageNameId": 5152,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.3,
                        "TrainTime": 21,
                        "internal_name": "EARAMBAI"
                    },
                    "1129": {
                        "AccuracyPercent": 80,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 6,
                        "AttackDelaySeconds": 0.6900000000000001,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 50
                        },
                        "FrameDelay": 23,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 1129,
                        "LanguageHelpId": 26165,
                        "LanguageNameId": 5165,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.1,
                        "TrainTime": 16,
                        "internal_name": "RATAN"
                    },
                    "1131": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 6,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 7,
                        "AttackDelaySeconds": 0.6900000000000001,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 7,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Gold": 45,
                            "Wood": 50
                        },
                        "FrameDelay": 23,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1131,
                        "LanguageHelpId": 26166,
                        "LanguageNameId": 5166,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 6,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 1.1,
                        "TrainTime": 16,
                        "internal_name": "ERATAN"
                    },
                    "1132": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 4,
                                "Class": 11
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 120,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 250,
                        "ID": 1132,
                        "LanguageHelpId": 26167,
                        "LanguageNameId": 5167,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.85,
                        "TrainTime": 24,
                        "internal_name": "BATELE"
                    },
                    "1134": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 5
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 7,
                                "Class": 11
                            },
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 7,
                                "Class": 13
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 120,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 300,
                        "ID": 1134,
                        "LanguageHelpId": 26168,
                        "LanguageNameId": 5168,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.85,
                        "TrainTime": 24,
                        "internal_name": "EBATELE"
                    },
                    "1155": {
                        "AccuracyPercent": 95,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.5066666666666667,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 28
                            },
                            {
                                "Amount": 3,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 15
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            }
                        ],
                        "Cost": {
                            "Food": 25,
                            "Wood": 35
                        },
                        "FrameDelay": 19,
                        "GarrisonCapacity": 0,
                        "HP": 35,
                        "ID": 1155,
                        "LanguageHelpId": 26190,
                        "LanguageNameId": 5190,
                        "LineOfSight": 7,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 1,
                        "PierceArmor": 5,
                        "Range": 5,
                        "RechargeRate": 0,
                        "ReloadTime": 3,
                        "Speed": 0.96,
                        "TrainTime": 22,
                        "internal_name": "IHXBOW"
                    },
                    "1225": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 1225,
                        "LanguageHelpId": 26288,
                        "LanguageNameId": 5288,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 1.35,
                        "TrainTime": 19,
                        "internal_name": "KONNIK"
                    },
                    "1227": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 1227,
                        "LanguageHelpId": 26290,
                        "LanguageNameId": 5290,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 1.35,
                        "TrainTime": 19,
                        "internal_name": "EKONNIK"
                    },
                    "1228": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 110,
                        "ID": 1228,
                        "LanguageHelpId": 26313,
                        "LanguageNameId": 5313,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.4,
                        "TrainTime": 16,
                        "internal_name": "KESHIK"
                    },
                    "1230": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 3,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 11,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 40
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 140,
                        "ID": 1230,
                        "LanguageHelpId": 26314,
                        "LanguageNameId": 5314,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 3,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.4,
                        "TrainTime": 14,
                        "internal_name": "EKESHIK"
                    },
                    "1231": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 4,
                        "AttackDelaySeconds": 0.49,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 35,
                            "Wood": 60
                        },
                        "FrameDelay": 21,
                        "GarrisonCapacity": 0,
                        "HP": 40,
                        "ID": 1231,
                        "LanguageHelpId": 26315,
                        "LanguageNameId": 5315,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2.2,
                        "Speed": 1.4,
                        "TrainTime": 20,
                        "internal_name": "KIPCHAK"
                    },
                    "1233": {
                        "AccuracyPercent": 90,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 28
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.49,
                        "Attacks": [
                            {
                                "Amount": 1,
                                "Class": 27
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 3
                            }
                        ],
                        "Cost": {
                            "Gold": 35,
                            "Wood": 60
                        },
                        "FrameDelay": 21,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1233,
                        "LanguageHelpId": 26327,
                        "LanguageNameId": 5327,
                        "LineOfSight": 6,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 4,
                        "RechargeRate": 0,
                        "ReloadTime": 2.2,
                        "Speed": 1.4,
                        "TrainTime": 20,
                        "internal_name": "EKIPCHAK"
                    },
                    "1234": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 31
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 1234,
                        "LanguageHelpId": 26328,
                        "LanguageNameId": 5328,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.4,
                        "TrainTime": 20,
                        "internal_name": "LEITIS"
                    },
                    "1236": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 14,
                                "Class": 31
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 50
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 130,
                        "ID": 1236,
                        "LanguageHelpId": 26329,
                        "LanguageNameId": 5329,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.9,
                        "Speed": 1.4,
                        "TrainTime": 18,
                        "internal_name": "ELEITIS"
                    },
                    "1252": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 0,
                            "Gold": 0
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1252,
                        "LanguageHelpId": 42057,
                        "LanguageNameId": 21057,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 0.9,
                        "TrainTime": 19,
                        "internal_name": "KONNIK_INF"
                    },
                    "1253": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 13,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 29
                            },
                            {
                                "Amount": 4,
                                "Class": 21
                            },
                            {
                                "Amount": 13,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            }
                        ],
                        "Cost": {
                            "Food": 0,
                            "Gold": 0
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 50,
                        "ID": 1253,
                        "LanguageHelpId": 42058,
                        "LanguageNameId": 21058,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 0.9,
                        "TrainTime": 19,
                        "internal_name": "EKONNIK_INF"
                    },
                    "1254": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 1254,
                        "LanguageHelpId": 26288,
                        "LanguageNameId": 5288,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 1.35,
                        "TrainTime": 19,
                        "internal_name": "KONNIK"
                    },
                    "1255": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 14,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 14,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 70
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 120,
                        "ID": 1255,
                        "LanguageHelpId": 26290,
                        "LanguageNameId": 5290,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2.4,
                        "Speed": 1.35,
                        "TrainTime": 19,
                        "internal_name": "EKONNIK"
                    },
                    "1258": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": -3,
                                "Class": 4
                            },
                            {
                                "Amount": 180,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 17
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 2,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 125,
                                "Class": 11
                            },
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 40,
                                "Class": 20
                            }
                        ],
                        "Cost": {
                            "Gold": 75,
                            "Wood": 160
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 4,
                        "HP": 175,
                        "ID": 1258,
                        "LanguageHelpId": 26094,
                        "LanguageNameId": 5094,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 180,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 0.5,
                        "TrainTime": 36,
                        "internal_name": "BTRAM"
                    },
                    "1263": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 30
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 20,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 100,
                                "Class": 11
                            },
                            {
                                "Amount": 20,
                                "Class": 4
                            },
                            {
                                "Amount": 50,
                                "Class": 8
                            },
                            {
                                "Amount": 50,
                                "Class": 30
                            },
                            {
                                "Amount": 130,
                                "Class": 5
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 75,
                            "Gold": 30
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 55,
                        "ID": 1263,
                        "LanguageHelpId": 26375,
                        "LanguageNameId": 5375,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 0,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 5,
                        "Speed": 1.3,
                        "TrainTime": 20,
                        "internal_name": "FCAMEL"
                    },
                    "1370": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 9,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 9,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 45
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 60,
                        "ID": 1370,
                        "LanguageHelpId": 26009,
                        "LanguageNameId": 5009,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 1,
                        "RechargeRate": 0,
                        "ReloadTime": 2.3,
                        "Speed": 1.45,
                        "TrainTime": 24,
                        "internal_name": "SLANCER"
                    },
                    "1372": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 11,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 20
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 70,
                            "Gold": 45
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 80,
                        "ID": 1372,
                        "LanguageHelpId": 26010,
                        "LanguageNameId": 5010,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 0,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 1,
                        "RechargeRate": 0,
                        "ReloadTime": 2.3,
                        "Speed": 1.45,
                        "TrainTime": 20,
                        "internal_name": "ESLANCER"
                    },
                    "1570": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 10,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 10,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 75
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 100,
                        "ID": 1570,
                        "LanguageHelpId": 26040,
                        "LanguageNameId": 5040,
                        "LineOfSight": 4,
                        "MaxCharge": 0,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 1.8,
                        "Speed": 1.35,
                        "TrainTime": 30,
                        "internal_name": "AZTRAIDER"
                    },
                    "1655": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 8,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 8,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 55
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 115,
                        "ID": 1655,
                        "LanguageHelpId": 26534,
                        "LanguageNameId": 5534,
                        "LineOfSight": 5,
                        "MaxCharge": 25,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeDuration": 40.0,
                        "RechargeRate": 0.625,
                        "ReloadTime": 1.9,
                        "Speed": 1.35,
                        "TrainTime": 15,
                        "internal_name": "COUSTILLIER"
                    },
                    "1657": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 2,
                                "Class": 4
                            },
                            {
                                "Amount": 0,
                                "Class": 8
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 0,
                                "Class": 15
                            },
                            {
                                "Amount": 0,
                                "Class": 11
                            },
                            {
                                "Amount": 0,
                                "Class": 21
                            },
                            {
                                "Amount": 11,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 55,
                            "Gold": 55
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 145,
                        "ID": 1657,
                        "LanguageHelpId": 26536,
                        "LanguageNameId": 5536,
                        "LineOfSight": 5,
                        "MaxCharge": 30,
                        "MeleeArmor": 2,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeDuration": 40.0,
                        "RechargeRate": 0.75,
                        "ReloadTime": 1.9,
                        "Speed": 1.35,
                        "TrainTime": 14,
                        "internal_name": "ECOUSTILLIER"
                    },
                    "1658": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 35
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1658,
                        "LanguageHelpId": 26538,
                        "LanguageNameId": 5538,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 12,
                        "internal_name": "SERJEANT"
                    },
                    "1659": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 11,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 35
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 75,
                        "ID": 1659,
                        "LanguageHelpId": 26540,
                        "LanguageNameId": 5540,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 4,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 12,
                        "internal_name": "ESERJEANT"
                    },
                    "1660": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 2,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 5,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 5,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 35
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 45,
                        "ID": 1660,
                        "LanguageHelpId": 26538,
                        "LanguageNameId": 5538,
                        "LineOfSight": 3,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 2,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 20,
                        "internal_name": "DSERJEANT"
                    },
                    "1661": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 4,
                                "Class": 4
                            },
                            {
                                "Amount": 4,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 11,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 3,
                                "Class": 29
                            },
                            {
                                "Amount": 3,
                                "Class": 21
                            },
                            {
                                "Amount": 11,
                                "Class": 4
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 35
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 75,
                        "ID": 1661,
                        "LanguageHelpId": 26540,
                        "LanguageNameId": 5540,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 4,
                        "MinRange": 0,
                        "PierceArmor": 4,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 20,
                        "internal_name": "EDSERJEANT"
                    },
                    "1699": {
                        "AccuracyPercent": 100,
                        "Armours": [
                            {
                                "Amount": 0,
                                "Class": 1
                            },
                            {
                                "Amount": 1,
                                "Class": 4
                            },
                            {
                                "Amount": 1,
                                "Class": 3
                            },
                            {
                                "Amount": 0,
                                "Class": 19
                            },
                            {
                                "Amount": 0,
                                "Class": 31
                            }
                        ],
                        "Attack": 12,
                        "AttackDelaySeconds": 0.0,
                        "Attacks": [
                            {
                                "Amount": 2,
                                "Class": 29
                            },
                            {
                                "Amount": 2,
                                "Class": 21
                            },
                            {
                                "Amount": 12,
                                "Class": 4
                            },
                            {
                                "Amount": 12,
                                "Class": 8
                            },
                            {
                                "Amount": 8,
                                "Class": 16
                            },
                            {
                                "Amount": 8,
                                "Class": 30
                            },
                            {
                                "Amount": 8,
                                "Class": 5
                            }
                        ],
                        "Cost": {
                            "Food": 60,
                            "Gold": 25
                        },
                        "FrameDelay": 0,
                        "GarrisonCapacity": 0,
                        "HP": 75,
                        "ID": 1699,
                        "LanguageHelpId": 26542,
                        "LanguageNameId": 5542,
                        "LineOfSight": 5,
                        "MaxCharge": 0,
                        "MeleeArmor": 1,
                        "MinRange": 0,
                        "PierceArmor": 1,
                        "Range": 0,
                        "RechargeRate": 0,
                        "ReloadTime": 2,
                        "Speed": 0.9,
                        "TrainTime": 14,
                        "internal_name": "FLEMISHPIKEMAN2"
                    }
                }
            },
            "tech_tree_strings": {
                "Building": "300084",
                "Civilization": "9681",
                "Key": "300081",
                "Technology": "300085",
                "Technology Tree": "9799",
                "Unique Unit": "300082",
                "Unit": "300083"
            },
            "techtrees": {
                "Aztecs": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "meso_",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        54,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        380,
                        408,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 460,
                        "castleAgeUniqueUnit": 725,
                        "imperialAgeUniqueTech": 24,
                        "imperialAgeUniqueUnit": 726
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        331,
                        358,
                        422,
                        440,
                        473,
                        492,
                        527,
                        529,
                        532,
                        539,
                        545,
                        548,
                        550,
                        567,
                        588,
                        751,
                        752,
                        753,
                        1103,
                        1104,
                        1105,
                        1258,
                        1570
                    ]
                },
                "Berbers": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        322,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        437,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 578,
                        "castleAgeUniqueUnit": 1007,
                        "imperialAgeUniqueTech": 579,
                        "imperialAgeUniqueUnit": 1009
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1010,
                        1012,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Britons": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        438,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 3,
                        "castleAgeUniqueUnit": 8,
                        "imperialAgeUniqueTech": 461,
                        "imperialAgeUniqueUnit": 530
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Bulgarians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792,
                        1251
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        322,
                        374,
                        377,
                        380,
                        408,
                        435,
                        436,
                        437,
                        438,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 685,
                        "castleAgeUniqueUnit": 1225,
                        "imperialAgeUniqueTech": 686,
                        "imperialAgeUniqueUnit": 1227
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        588,
                        1103,
                        1104,
                        1105,
                        1254,
                        1255,
                        1258
                    ]
                },
                "Burgundians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        374,
                        379,
                        408,
                        441,
                        602,
                        608
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 754,
                        "castleAgeUniqueUnit": 1655,
                        "imperialAgeUniqueTech": 755,
                        "imperialAgeUniqueUnit": 1657
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        527,
                        529,
                        532,
                        539,
                        545,
                        546,
                        550,
                        567,
                        569,
                        691,
                        1103,
                        1104,
                        1105,
                        1258,
                        1699
                    ]
                },
                "Burmese": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        213,
                        215,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        316,
                        319,
                        322,
                        374,
                        375,
                        377,
                        380,
                        408,
                        435,
                        436,
                        438,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 626,
                        "castleAgeUniqueUnit": 1126,
                        "imperialAgeUniqueTech": 627,
                        "imperialAgeUniqueUnit": 1128
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1103,
                        1104,
                        1105,
                        1132,
                        1134,
                        1258
                    ]
                },
                "Byzantines": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        322,
                        373,
                        374,
                        375,
                        379,
                        408,
                        437,
                        438,
                        439,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 464,
                        "castleAgeUniqueUnit": 40,
                        "imperialAgeUniqueTech": 61,
                        "imperialAgeUniqueUnit": 553
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        545,
                        546,
                        548,
                        550,
                        567,
                        569,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Celts": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        231,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 482,
                        "castleAgeUniqueUnit": 232,
                        "imperialAgeUniqueTech": 5,
                        "imperialAgeUniqueUnit": 534
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        569,
                        588,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Chinese": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        380,
                        408,
                        435,
                        437,
                        438,
                        441,
                        602,
                        608
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 462,
                        "castleAgeUniqueUnit": 73,
                        "imperialAgeUniqueTech": 52,
                        "imperialAgeUniqueUnit": 559
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Cumans": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        199,
                        209,
                        276,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        50,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        182,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        231,
                        249,
                        252,
                        278,
                        280,
                        315,
                        319,
                        321,
                        322,
                        374,
                        379,
                        380,
                        408,
                        435,
                        436,
                        437,
                        439,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 689,
                        "castleAgeUniqueUnit": 1231,
                        "imperialAgeUniqueTech": 690,
                        "imperialAgeUniqueUnit": 1233
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        331,
                        358,
                        359,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        532,
                        539,
                        545,
                        546,
                        548,
                        550,
                        567,
                        569,
                        588,
                        1103,
                        1104,
                        1105,
                        1258,
                        1370,
                        1372
                    ]
                },
                "Ethiopians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        380,
                        408,
                        437,
                        438,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 574,
                        "castleAgeUniqueUnit": 1016,
                        "imperialAgeUniqueTech": 575,
                        "imperialAgeUniqueUnit": 1018
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        529,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        588,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Franks": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        322,
                        374,
                        375,
                        377,
                        379,
                        408,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 493,
                        "castleAgeUniqueUnit": 281,
                        "imperialAgeUniqueTech": 83,
                        "imperialAgeUniqueUnit": 531
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        569,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Goths": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        199,
                        209,
                        276,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        321,
                        322,
                        373,
                        374,
                        380,
                        408,
                        435,
                        438,
                        441
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 16,
                        "castleAgeUniqueUnit": 41,
                        "imperialAgeUniqueTech": 457,
                        "imperialAgeUniqueUnit": 555
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Huns": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        182,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        221,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        319,
                        321,
                        322,
                        374,
                        375,
                        408,
                        435,
                        436,
                        437,
                        439,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 483,
                        "castleAgeUniqueUnit": 755,
                        "imperialAgeUniqueTech": 21,
                        "imperialAgeUniqueUnit": 757
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        539,
                        545,
                        546,
                        548,
                        569,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Incas": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "meso_",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        230,
                        231,
                        233,
                        249,
                        278,
                        279,
                        280,
                        315,
                        316,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        437,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 516,
                        "castleAgeUniqueUnit": 879,
                        "imperialAgeUniqueTech": 517,
                        "imperialAgeUniqueUnit": 881
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        185,
                        279,
                        280,
                        331,
                        358,
                        359,
                        422,
                        440,
                        442,
                        473,
                        492,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        548,
                        550,
                        567,
                        751,
                        752,
                        753,
                        1103,
                        1104,
                        1105,
                        1258,
                        1570
                    ]
                },
                "Indians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        322,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        436,
                        437,
                        438,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 506,
                        "castleAgeUniqueUnit": 873,
                        "imperialAgeUniqueTech": 507,
                        "imperialAgeUniqueUnit": 875
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        207,
                        279,
                        280,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        539,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Italians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        322,
                        373,
                        374,
                        375,
                        379,
                        380,
                        408,
                        435,
                        437,
                        438,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 494,
                        "castleAgeUniqueUnit": 866,
                        "imperialAgeUniqueTech": 499,
                        "imperialAgeUniqueUnit": 868
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        492,
                        527,
                        529,
                        532,
                        539,
                        545,
                        546,
                        550,
                        567,
                        691,
                        882,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Japanese": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        316,
                        319,
                        322,
                        373,
                        374,
                        375,
                        377,
                        408,
                        435,
                        436,
                        437,
                        438,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 484,
                        "castleAgeUniqueUnit": 291,
                        "imperialAgeUniqueTech": 59,
                        "imperialAgeUniqueUnit": 560
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Khmer": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        219,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        321,
                        322,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        436,
                        438,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 622,
                        "castleAgeUniqueUnit": 1120,
                        "imperialAgeUniqueTech": 623,
                        "imperialAgeUniqueUnit": 1122
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        691,
                        1103,
                        1104,
                        1105,
                        1132,
                        1134,
                        1258
                    ]
                },
                "Koreans": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        322,
                        373,
                        374,
                        375,
                        377,
                        380,
                        408,
                        437,
                        438,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 486,
                        "castleAgeUniqueUnit": 827,
                        "imperialAgeUniqueTech": 445,
                        "imperialAgeUniqueUnit": 829
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        529,
                        532,
                        539,
                        545,
                        546,
                        550,
                        567,
                        588,
                        691,
                        831,
                        832,
                        1103,
                        1105,
                        1258
                    ]
                },
                "Lithuanians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        322,
                        374,
                        375,
                        379,
                        380,
                        408,
                        435,
                        437,
                        438,
                        439,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 691,
                        "castleAgeUniqueUnit": 1234,
                        "imperialAgeUniqueTech": 692,
                        "imperialAgeUniqueUnit": 1236
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        532,
                        539,
                        545,
                        546,
                        550,
                        567,
                        569,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Magyars": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        47,
                        48,
                        50,
                        54,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        436,
                        437,
                        438,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 514,
                        "castleAgeUniqueUnit": 869,
                        "imperialAgeUniqueTech": 515,
                        "imperialAgeUniqueUnit": 871
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        567,
                        569,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Malay": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        230,
                        231,
                        233,
                        249,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        380,
                        408,
                        437,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 624,
                        "castleAgeUniqueUnit": 1123,
                        "imperialAgeUniqueTech": 625,
                        "imperialAgeUniqueUnit": 1125
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        492,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        550,
                        691,
                        1103,
                        1104,
                        1105,
                        1132,
                        1134,
                        1258
                    ]
                },
                "Malians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        230,
                        231,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        374,
                        375,
                        379,
                        380,
                        408,
                        435,
                        437,
                        438,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 576,
                        "castleAgeUniqueUnit": 1013,
                        "imperialAgeUniqueTech": 577,
                        "imperialAgeUniqueUnit": 1015
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        420,
                        422,
                        440,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        545,
                        546,
                        550,
                        567,
                        588,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Mayans": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "meso_",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        379,
                        380,
                        408,
                        437,
                        438,
                        439,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 485,
                        "castleAgeUniqueUnit": 763,
                        "imperialAgeUniqueTech": 4,
                        "imperialAgeUniqueUnit": 765
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        331,
                        358,
                        359,
                        422,
                        440,
                        442,
                        473,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        548,
                        550,
                        751,
                        752,
                        753,
                        1103,
                        1104,
                        1105,
                        1258,
                        1570
                    ]
                },
                "Mongols": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        319,
                        321,
                        322,
                        373,
                        374,
                        377,
                        379,
                        408,
                        435,
                        436,
                        437,
                        439,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 487,
                        "castleAgeUniqueUnit": 11,
                        "imperialAgeUniqueTech": 6,
                        "imperialAgeUniqueUnit": 561
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        588,
                        1103,
                        1104,
                        1105,
                        1258,
                        1370,
                        1372
                    ]
                },
                "Persians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        321,
                        322,
                        374,
                        375,
                        379,
                        380,
                        408,
                        435,
                        436,
                        437,
                        438,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 488,
                        "castleAgeUniqueUnit": 239,
                        "imperialAgeUniqueTech": 7,
                        "imperialAgeUniqueUnit": 558
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        474,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        569,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Portuguese": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792,
                        1021
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        219,
                        221,
                        230,
                        231,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        374,
                        375,
                        377,
                        380,
                        408,
                        435,
                        437,
                        438,
                        439,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 572,
                        "castleAgeUniqueUnit": 1001,
                        "imperialAgeUniqueTech": 573,
                        "imperialAgeUniqueUnit": 1003
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        492,
                        527,
                        528,
                        529,
                        539,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1004,
                        1006,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Saracens": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        63,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        316,
                        319,
                        322,
                        374,
                        375,
                        377,
                        379,
                        408,
                        435,
                        436,
                        437,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 490,
                        "castleAgeUniqueUnit": 282,
                        "imperialAgeUniqueTech": 9,
                        "imperialAgeUniqueUnit": 556
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        329,
                        330,
                        331,
                        358,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        539,
                        545,
                        546,
                        548,
                        550,
                        567,
                        588,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Sicilians": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        199,
                        209,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792,
                        1665
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        182,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        321,
                        322,
                        373,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 756,
                        "castleAgeUniqueUnit": 1658,
                        "imperialAgeUniqueTech": 757,
                        "imperialAgeUniqueUnit": 1659
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        492,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        1103,
                        1104,
                        1105,
                        1258,
                        1660,
                        1661
                    ]
                },
                "Slavs": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        374,
                        375,
                        377,
                        379,
                        408,
                        435,
                        438,
                        441,
                        602,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 512,
                        "castleAgeUniqueUnit": 876,
                        "imperialAgeUniqueTech": 513,
                        "imperialAgeUniqueUnit": 878
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        588,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Spanish": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        379,
                        408,
                        435,
                        437,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 492,
                        "castleAgeUniqueUnit": 771,
                        "imperialAgeUniqueTech": 440,
                        "imperialAgeUniqueUnit": 773
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        532,
                        539,
                        545,
                        546,
                        548,
                        550,
                        567,
                        569,
                        691,
                        775,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Tatars": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        47,
                        48,
                        50,
                        54,
                        55,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        230,
                        233,
                        249,
                        252,
                        278,
                        280,
                        315,
                        319,
                        321,
                        322,
                        374,
                        375,
                        377,
                        380,
                        408,
                        435,
                        436,
                        437,
                        441,
                        602
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 687,
                        "castleAgeUniqueUnit": 1228,
                        "imperialAgeUniqueTech": 688,
                        "imperialAgeUniqueUnit": 1230
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        529,
                        532,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        691,
                        1103,
                        1104,
                        1105,
                        1258,
                        1263,
                        1370,
                        1372
                    ]
                },
                "Teutons": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        50,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        252,
                        278,
                        279,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        374,
                        377,
                        379,
                        380,
                        408,
                        435,
                        438,
                        439,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 489,
                        "castleAgeUniqueUnit": 25,
                        "imperialAgeUniqueTech": 11,
                        "imperialAgeUniqueUnit": 554
                    },
                    "units": [
                        4,
                        5,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        527,
                        528,
                        529,
                        532,
                        539,
                        542,
                        545,
                        550,
                        567,
                        569,
                        588,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Turks": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        231,
                        249,
                        252,
                        278,
                        280,
                        315,
                        316,
                        319,
                        321,
                        322,
                        373,
                        374,
                        375,
                        379,
                        380,
                        408,
                        435,
                        436,
                        437,
                        438,
                        439,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 491,
                        "castleAgeUniqueUnit": 46,
                        "imperialAgeUniqueTech": 10,
                        "imperialAgeUniqueUnit": 557
                    },
                    "units": [
                        4,
                        5,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        329,
                        330,
                        331,
                        420,
                        422,
                        440,
                        441,
                        442,
                        448,
                        473,
                        474,
                        527,
                        528,
                        529,
                        539,
                        542,
                        545,
                        546,
                        548,
                        567,
                        691,
                        1103,
                        1104,
                        1105,
                        1258
                    ]
                },
                "Vietnamese": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        235,
                        236,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        15,
                        17,
                        22,
                        23,
                        39,
                        45,
                        47,
                        48,
                        54,
                        55,
                        63,
                        64,
                        65,
                        67,
                        68,
                        74,
                        76,
                        77,
                        80,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        231,
                        233,
                        249,
                        278,
                        279,
                        280,
                        315,
                        319,
                        321,
                        322,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        435,
                        437,
                        438,
                        441,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 628,
                        "castleAgeUniqueUnit": 1129,
                        "imperialAgeUniqueTech": 629,
                        "imperialAgeUniqueUnit": 1131
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        36,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        279,
                        280,
                        283,
                        331,
                        358,
                        359,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        474,
                        492,
                        527,
                        528,
                        529,
                        539,
                        545,
                        546,
                        550,
                        567,
                        691,
                        1103,
                        1104,
                        1105,
                        1132,
                        1134,
                        1155,
                        1258
                    ]
                },
                "Vikings": {
                    "buildings": [
                        12,
                        45,
                        49,
                        50,
                        68,
                        70,
                        72,
                        79,
                        82,
                        84,
                        87,
                        101,
                        103,
                        104,
                        109,
                        117,
                        155,
                        199,
                        209,
                        234,
                        276,
                        487,
                        562,
                        584,
                        598,
                        621,
                        792
                    ],
                    "monkPrefix": "",
                    "techs": [
                        8,
                        12,
                        13,
                        14,
                        17,
                        22,
                        23,
                        45,
                        47,
                        48,
                        50,
                        51,
                        54,
                        55,
                        65,
                        67,
                        68,
                        74,
                        75,
                        76,
                        77,
                        81,
                        82,
                        93,
                        101,
                        102,
                        103,
                        140,
                        182,
                        194,
                        199,
                        200,
                        201,
                        202,
                        203,
                        211,
                        212,
                        213,
                        215,
                        219,
                        221,
                        230,
                        249,
                        252,
                        278,
                        280,
                        315,
                        319,
                        321,
                        322,
                        374,
                        375,
                        377,
                        379,
                        380,
                        408,
                        437,
                        439,
                        602,
                        608,
                        716
                    ],
                    "unique": {
                        "castleAgeUniqueTech": 463,
                        "castleAgeUniqueUnit": 692,
                        "imperialAgeUniqueTech": 49,
                        "imperialAgeUniqueUnit": 694
                    },
                    "units": [
                        4,
                        6,
                        7,
                        13,
                        17,
                        21,
                        24,
                        38,
                        39,
                        74,
                        75,
                        77,
                        83,
                        93,
                        125,
                        128,
                        250,
                        279,
                        280,
                        283,
                        331,
                        358,
                        420,
                        422,
                        440,
                        442,
                        448,
                        473,
                        492,
                        527,
                        528,
                        533,
                        539,
                        542,
                        545,
                        546,
                        548,
                        550,
                        567,
                        691,
                        1104,
                        1105,
                        1258
                    ]
                }
            }
        };
        civs = data.techtrees;
        data.strings = {
            "4201": "Темная эпоха",
            "4202": "Феодальная эпоха",
            "4203": "Замковая эпоха",
            "4204": "Имперская эпоха",
            "5009": "Копейщик-степняк",
            "5010": "Элитный копейщик-степняк",
            "5040": "Шолотль",
            "5068": "Латник",
            "5070": "Рыцарь",
            "5078": "Копейщик",
            "5079": "Ополченец",
            "5080": "Ополченец с мечом",
            "5081": "Воин с длинным мечом",
            "5083": "Лучник",
            "5084": "Воин с самострелом",
            "5085": "Конный лучник",
            "5086": "Кулевринер",
            "5087": "Элитный застрельщик",
            "5088": "Застрельщик",
            "5089": "Торговый когг",
            "5090": "Рыбацкое судно",
            "5091": "Боевая галера",
            "5093": "Бомбарда",
            "5094": "Деревянный таран",
            "5095": "Мангонель",
            "5096": "Скорпион",
            "5097": "Требушет",
            "5099": "Монах",
            "5101": "Катафракт",
            "5102": "Стрелок с чо-ко-ну",
            "5103": "Мамлюк",
            "5104": "Хускарл",
            "5105": "Янычар",
            "5106": "Драккар",
            "5107": "Английский лучник",
            "5108": "Мангут",
            "5109": "Персидский боевой слон",
            "5110": "Самурай",
            "5111": "Метатель топоров",
            "5112": "Тевтонский рыцарь",
            "5113": "Раскрашенный разбойник",
            "5114": "Кондотьер",
            "5128": "Стрельбище",
            "5129": "Рибадекин",
            "5130": "Элитный рибадекин",
            "5131": "Кузница",
            "5132": "Каравелла",
            "5133": "Элитная каравелла",
            "5134": "Лучник на верблюде",
            "5135": "Казарма",
            "5136": "Элитный лучник на верблюде",
            "5137": "Генитур",
            "5138": "Монастырь",
            "5139": "Элитный генитур",
            "5140": "Гбето",
            "5141": "Элитная гбето",
            "5142": "Замок",
            "5143": "Амхарский воин",
            "5144": "Пристань",
            "5145": "Элитный амхарский воин",
            "5146": "Слон с баллистой",
            "5147": "Элитный слон с баллистой",
            "5148": "Пендекар",
            "5149": "Ферма",
            "5150": "Элитный пендекар",
            "5151": "Арамбай",
            "5152": "Элитный арамбай",
            "5154": "Защитная башня",
            "5155": "Донжон",
            "5156": "Пушечная башня",
            "5157": "Мельница",
            "5159": "Фактория",
            "5160": "Огневая галера",
            "5161": "Рынок",
            "5162": "Малый брандер",
            "5164": "Ратуша",
            "5165": "Лучник с ротангом",
            "5166": "Элитный лучник с ротангом",
            "5167": "Боевой слон",
            "5168": "Элитный боевой слон",
            "5169": "Инженерная мастерская",
            "5171": "Конюшня",
            "5176": "Университет",
            "5178": "Смотровая вышка",
            "5182": "Чудо света",
            "5185": "Ворота",
            "5186": "Бревенчатые ворота",
            "5190": "Имперский застрельщик",
            "5202": "Частокол",
            "5203": "Каменная стена",
            "5204": "Укрепленная стена",
            "5287": "Военный галеон",
            "5288": "Конник",
            "5289": "Крытый таран",
            "5290": "Элитный конник",
            "5309": "Галеон",
            "5313": "Кэшик",
            "5314": "Элитный кэшик",
            "5315": "Кипчак",
            "5326": "Конный разведчик",
            "5327": "Элитный кипчак",
            "5328": "Лейти",
            "5329": "Элитный лейти",
            "5344": "Дом",
            "5349": "Крепость",
            "5375": "Совар",
            "5408": "Пикинер",
            "5409": "Алебардист",
            "5411": "Воин с двуручным мечом",
            "5412": "Тяжелый конный лучник",
            "5416": "Мехарист",
            "5417": "Тяжелый мехарист",
            "5418": "Арбалетчик",
            "5419": "Имперский мехарист",
            "5424": "Брандер",
            "5425": "Тяжелый брандер",
            "5426": "Огневой корабль",
            "5429": "Быстрый огневой корабль",
            "5436": "Галера",
            "5439": "Тяжелый скорпион",
            "5443": "Транспортный корабль",
            "5444": "Легкий кавалерист",
            "5445": "Осадная башня",
            "5446": "Осадный таран",
            "5447": "Боярин",
            "5448": "Онагр",
            "5449": "Элитный боярин",
            "5451": "Элитный катафракт",
            "5452": "Элитный стрелок с чо-ко-ну",
            "5453": "Элитный мамлюк",
            "5454": "Элитный хускарл",
            "5455": "Элитный янычар",
            "5456": "Элитный английский лучник",
            "5457": "Элитный драккар",
            "5458": "Элитный мангут",
            "5459": "Элитный персидский боевой слон",
            "5460": "Элитный самурай",
            "5461": "Элитный метатель топоров",
            "5462": "Элитный тевтонский рыцарь",
            "5463": "Элитный раскрашенный разбойник",
            "5464": "Лесопилка",
            "5469": "Чемпион",
            "5471": "Паладин",
            "5487": "Рудник",
            "5493": "Осадный онагр",
            "5495": "Невод",
            "5504": "Застава",
            "5534": "Кутилье",
            "5536": "Элитный кутилье",
            "5538": "Сержант",
            "5540": "Элитный сержант",
            "5542": "Фламандский ополченец",
            "5544": "Башня-замок",
            "5573": "Элитный военный галеон",
            "5574": "Берсерк",
            "5576": "Элитный берсерк",
            "5606": "Крестьянин",
            "5660": "Подрывник",
            "5661": "Гусар",
            "5667": "Воин-ягуар",
            "5669": "Элитный воин-ягуар",
            "5671": "Воин-орел",
            "5672": "Орел-разведчик",
            "5673": "Элитный воин-орел",
            "5675": "Таркан",
            "5677": "Элитный таркан",
            "5682": "Лучник на слоне",
            "5683": "Лучник-холькан",
            "5684": "Элитный лучник на слоне",
            "5685": "Элитный лучник-холькан",
            "5686": "Камаюк",
            "5687": "Конкистадор",
            "5688": "Элитный камаюк",
            "5689": "Элитный конкистадор",
            "5690": "Пращник",
            "5691": "Миссионер",
            "5723": "Генуэзский арбалетчик",
            "5725": "Элитный генуэзский арбалетчик",
            "5727": "Боевая телега",
            "5728": "Мадьярский гусар",
            "5729": "Элитная боевая телега",
            "5730": "Элитный мадьярский гусар",
            "5731": "Корабль-черепаха",
            "5732": "Элитный корабль-черепаха",
            "7008": "Городская стража",
            "7012": "Севооборот",
            "7013": "Тяжелый плуг",
            "7014": "Хомут",
            "7015": "Цехи",
            "7017": "Банковское дело",
            "7019": "Картография",
            "7022": "Ткачество",
            "7023": "Чеканка монет",
            "7039": "Коневодство",
            "7045": "Вера",
            "7047": "Химия",
            "7050": "Каменная кладка",
            "7051": "Архитектура",
            "7054": "Подъемный кран",
            "7055": "Золотодобыча",
            "7059": "Катапаруто",
            "7063": "Донжон",
            "7067": "Ковка",
            "7068": "Чугунное литье",
            "7074": "Ламеллярные доспехи",
            "7075": "Доменная печь",
            "7076": "Кольчуга",
            "7077": "Пластинчатые доспехи",
            "7080": "Пластинчатые доспехи для коня",
            "7081": "Ламеллярные доспехи для коня",
            "7082": "Кольчужная попона",
            "7090": "Слежка",
            "7093": "Баллистика",
            "7101": "Феодальная эпоха",
            "7102": "Замковая эпоха",
            "7103": "Имперская эпоха",
            "7150": "Игловидные наконечники",
            "7151": "Наручи",
            "7163": "Укрепленная стена",
            "7172": "Оперение стрел",
            "7180": "Золотые рудники",
            "7186": "Защитная башня",
            "7189": "Двуострый топор",
            "7190": "Лучковая пила",
            "7208": "Стеганые доспехи для стрелков",
            "7209": "Кожаные доспехи для стрелков",
            "7210": "Оруженосцы",
            "7211": "Ручная тележка",
            "7216": "Кольчуга для стрелков",
            "7220": "Вдохновение",
            "7221": "Святость",
            "7222": "Ксилография",
            "7231": "Двуручная пила",
            "7246": "Ручная повозка",
            "7249": "Рвение",
            "7250": "Каракка",
            "7251": "Аркебуза",
            "7252": "Королевские наследники",
            "7253": "Торсионные механизмы",
            "7254": "Тигуи",
            "7255": "Фаримба",
            "7256": "Касба",
            "7257": "Магрибские верблюды",
            "7258": "Поджог",
            "7266": "Уарака",
            "7267": "Матерчатые щиты",
            "7268": "Православие",
            "7269": "Дружина",
            "7270": "Султаны",
            "7271": "Шатагни",
            "7272": "Павеза",
            "7273": "Великий шелковый путь",
            "7274": "Лук двойной кривизны",
            "7275": "Армия Корвина",
            "7276": "Каменоломни",
            "7277": "Каменные рудники",
            "7278": "Бойницы",
            "7280": "Кочевники",
            "7281": "Камандаран",
            "7282": "Городские патрули",
            "7283": "Железная обшивка",
            "7284": "Медресе",
            "7285": "Сипахи",
            "7286": "Инквизиция",
            "7287": "Рыцарство",
            "7291": "Клинки для бивней",
            "7292": "Спаренный самострел",
            "7293": "Талассократия",
            "7294": "Принудительная мобилизация",
            "7295": "Башни на слонах",
            "7296": "Манипурская конница",
            "7297": "Шатри",
            "7298": "Бумажные деньги",
            "7307": "Стремена",
            "7308": "Багаины",
            "7309": "Церемониальные доспехи",
            "7310": "Осадное искусство чингизидов",
            "7311": "Степное коневодство",
            "7312": "Ярлы",
            "7313": "Греческий огонь",
            "7314": "Жаберные сети",
            "7315": "Искупление",
            "7316": "Примирение",
            "7318": "Логистика",
            "7319": "Воинская повинность",
            "7320": "Пушечная башня",
            "7321": "Горизонтальные бойницы",
            "7322": "Саперы",
            "7324": "Скеггокс",
            "7325": "Превосходство",
            "7326": "Атлатль",
            "7327": "Осадный требушет",
            "7342": "Бургундские виноградники",
            "7343": "Фламандская революция",
            "7344": "Первый крестовый поход",
            "7345": "Щитовые деньги",
            "7368": "Великая Китайская стена",
            "7369": "Цитадель",
            "7370": "Мародеры",
            "7371": "Ясама",
            "7372": "Килевание",
            "7373": "Сухой док",
            "7374": "Раскаленные ядра",
            "7376": "Гурдиции",
            "7377": "Судостроение",
            "7378": "Осадная инженерия",
            "7379": "Копьеносцы с хульче",
            "7380": "Ыпсон",
            "7398": "Половецкие наемники",
            "7399": "Крепости в холмах",
            "7400": "Ростовые щиты",
            "7403": "Припасы",
            "7408": "Шпионаж/измена",
            "7409": "Родословная",
            "7410": "Караван",
            "7411": "Кольцо лучника",
            "7412": "Ересь",
            "7415": "Парфянская тактика",
            "7416": "Теократия",
            "7419": "Йомены",
            "7420": "Эльдорадо",
            "7421": "Ярость кельтов",
            "7422": "Сверло",
            "7423": "Погонщики слонов",
            "7424": "Зелоты",
            "7425": "Артиллерия",
            "7426": "Зубчатые стены",
            "7427": "Анархия",
            "7428": "Атеизм",
            "7429": "Захватнические войны",
            "7431": "Исступление",
            "7432": "Ракеты",
            "7435": "Лечение травами",
            "7438": "Зажигательные снаряды",
            "7439": "Мобилизация",
            "9681": "Цивилизация",
            "9799": "Дерево технологий",
            "10271": "Британцы",
            "10272": "Франки",
            "10273": "Готы",
            "10274": "Тевтоны",
            "10275": "Японцы",
            "10276": "Китайцы",
            "10277": "Византийцы",
            "10278": "Персы",
            "10279": "Сарацины",
            "10280": "Турки",
            "10281": "Викинги",
            "10282": "Монголы",
            "10283": "Кельты",
            "10284": "Испанцы",
            "10285": "Ацтеки",
            "10286": "Майя",
            "10287": "Гунны",
            "10288": "Корейцы",
            "10289": "Итальянцы",
            "10290": "Индийцы",
            "10291": "Инки",
            "10292": "Венгры",
            "10293": "Славяне",
            "10294": "Португальцы",
            "10295": "Эфиопы",
            "10296": "Малийцы",
            "10297": "Берберы",
            "10298": "Кхмеры",
            "10299": "Малайцы",
            "10300": "Бирманцы",
            "10301": "Вьетнамцы",
            "10302": "Болгары",
            "10303": "Татары",
            "10304": "Половцы",
            "10305": "Литовцы",
            "10306": "Бургундцы",
            "10307": "Сицилийцы",
            "19052": "Торговый обоз",
            "21057": "Конник (спешившийся)",
            "21058": "Элитный конник (спешившийся)",
            "26009": "Создать <b>копейщика-степняка</b> (‹cost›) <br>\nЛегкий кавалерист с увеличенным радиусом атаки. Эффективен в отрядах. Не эффективен против мехаристов и стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного копейщика-степняка — 900 ед. пищи, 550 ед. золота (конюшня); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26010": "Создать <b>элитного копейщика-степняка</b> (‹cost›) <br>\nЛегкий кавалерист с увеличенным радиусом атаки. Эффективен в отрядах. Не эффективен против мехаристов и стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26040": "Создать <b>шолотля</b> (‹cost›) <br>\nМезоамериканский всадник. Эффективен против пехоты и осадных орудий. Неэффективен против пикинеров и мехаристов.<i> Улучшения: атака (кузница); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26068": "Создать <b>латника</b> (‹cost›) <br>\nУниверсальный мощный всадник. Эффективен против пехоты и стрелков. Не эффективен против пикинеров, мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до рыцаря — 300 ед. пищи, 300 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26070": "Создать <b>рыцаря</b> (‹cost›) <br>\nУниверсальный мощный всадник. Эффективен против пехоты и стрелков. Не эффективен против пикинеров, мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до паладина — 1300 ед. пищи, 750 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26078": "Создать <b>копейщика</b> (‹cost›) <br>\nПехотинец для борьбы со всадниками. Эффективен против верховых юнитов, особенно слонов. Не эффективен против стрелков и пехоты.<i> Улучшения: атака, защита (кузница); скорость, до пикинера — 215 ед. пищи, 90 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26079": "Создать <b>ополченца</b> (‹cost›) <br>\nУниверсальный пехотинец. Эффективен против построек и пехоты. Не эффективен против стрелков на большом расстоянии.<i> Улучшения: атака, защита (кузница); стоимость, скорость, до ополченца с мечом — 100 ед. пищи, 40 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26080": "Создать <b>ополченца с мечом</b> (‹cost›) <br>\nУниверсальный пехотинец. Эффективен против построек и пехоты. Не эффективен против стрелков на большом расстоянии.<i> Улучшения: атака, защита (кузница); стоимость, скорость, до воина с длинным мечом — 200 ед. пищи, 65 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26081": "Создать <b>воина с длинным мечом</b> (‹cost›) <br>\nУниверсальный пехотинец. Эффективен против построек и пехоты. Не эффективен против стрелков на большом расстоянии.<i> Улучшения: атака, защита (кузница); стоимость, скорость, до воина с двуручным мечом — 300 ед. пищи, 100 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26083": "Создать <b>лучника</b> (‹cost›) <br>\nСтрелковый юнит. Эффективен в атаках на расстоянии. Не эффективен против застрельщиков и в ближнем бою.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); точность, до воина с самострелом — 125 ед. пищи, 75 ед. золота (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26084": "Создать <b>воина с самострелом</b> (‹cost›) <br>\nСтрелковый юнит. Эффективен в атаках на расстоянии. Не эффективен против элитных застрельщиков и мангонелей, а также в ближнем бою.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); точность, до арбалетчика — 350 ед. пищи, 300 ед. золота (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26085": "Создать <b>конного лучника</b> (‹cost›) <br>\nВерховой стрелок. Эффективен против медленных юнитов в атаках на расстоянии. Не эффективен против элитных застрельщиков и в ближнем бою.<i> Улучшения: скорость, здоровье (конюшня); атака, радиус атаки, защита (кузница); атака, точность (университет); точность, защита, до тяжелого конного лучника — 900 ед. пищи, 500 ед. золота (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26086": "Создать <b>кулевринера</b> (‹cost›) <br>\nЮнит с огнестрельным оружием. Отличается мощной атакой, однако теряет точность на большом расстоянии. Эффективен против пехоты. Не эффективен против элитных застрельщиков и стрелков.<i> Улучшения: защита (кузница); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26087": "Создать <b>элитного застрельщика</b> (‹cost›) <br>\nСтрелковый юнит для борьбы со стрелками. Не может атаковать в ближнем бою. Эффективен против стрелков.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); точность, до имперского застрельщика — 300 ед. пищи, 450 ед. золота (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26088": "Создать <b>застрельщика</b> (‹cost›) <br>\nСтрелковый юнит для борьбы со стрелками. Не может атаковать в ближнем бою. Эффективен против стрелков.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); точность, до элитного застрельщика — 230 ед. древесины, 130 ед. золота (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26089": "Построить <b>торговый когг</b> (‹cost›) <br>\nЭтот торговый юнит добывает золото на пристани другого игрока. Чтобы торговать, выберите торговый когг и щелкните правой кнопкой мыши по пристани другого игрока. На вашу пристань когг привезет золото.<i> Улучшения: приносит больше золота (рынок); защита, стоимость (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26090": "Построить <b>рыбацкое судно</b> (‹cost›) <br>\nДобывает пищу при ловле рыбы и из невода. Строит неводы.<i> Улучшения: защита, стоимость, скорость, эффективность (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26091": "Построить <b>боевую галеру</b> (‹cost›) <br>\nУниверсальный военный корабль, который атакует на расстоянии. Не эффективен против огневых кораблей.<i> Улучшения: защита, стоимость, скорость, до галеона — 400 ед. пищи, 315 ед. древесины (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26093": "Построить <b>бомбарду</b> (‹cost›) <br>\nОсадное орудие с большим радиусом атаки. Эффективно против построек и осадных орудий. Не эффективно в ближнем бою.<i> Улучшения: атака, радиус атаки (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26094": "Построить <b>деревянный таран</b> (‹cost›) <br>\nОсадное орудие, применяется против построек. Устойчиво к большинству атак на расстоянии. Размещенная внутри пехота увеличивает скорость и улучшает атаку орудия.<i> Улучшения: атака (университет); до крытого тарана — 300 ед. пищи (инженерная мастерская); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26095": "Построить <b>мангонель</b> (‹cost›) <br>\nСтрелковое осадное орудие. Наносит урон по площади, но не может атаковать в ближнем бою. Эффективно против плотных групп юнитов.<i> Улучшения: атака, радиус атаки (университет); до онагра — 800 ед. пищи, 500 ед. золота (инженерная мастерская); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26096": "Построить <b>скорпион</b> (‹cost›) <br>\nОсадное орудие, стреляющее снарядами в форме копья. Эффективно против крупных отрядов, так как наносит урон сразу нескольким целям. Не эффективно против всадников и осадных орудий.<i> Улучшения: атака, радиус атаки (университет); до тяжелого скорпиона — 1000 ед. пищи, 1100 ед. древесины (инженерная мастерская); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26097": "Построить <b>требушет</b> (‹cost›) <br>\nМощное осадное орудие с большим радиусом атаки, применяется против построек. Не может атаковать в ближнем бою. Перевозится в свернутом виде, для стрельбы его нужно развернуть. Может валить деревья. Эффективно против построек.<i> Улучшения: атака, радиус атаки (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26099": "Создать <b>монаха</b> (‹cost›) <br>\nОбращает вражеские юниты. Восстанавливает здоровье дружественных юнитов (за исключением кораблей и осадных орудий). Эффективен против медленных юнитов с холодным оружием. Не эффективен против легкой кавалерии и стрелковых юнитов. Может собирать реликвии и приносить их в монастыри.<i> Улучшения: в монастыре.</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26100": "Построить <b>торговый обоз</b> (‹cost›) <br>\nЮнит для торговли на рынке с другими игроками. Отвозит товары с вашего рынка на рынок другого игрока и привозит обратно золото. Чтобы торговать, выберите торговый обоз и щелкните правой кнопкой мыши по рынку другого игрока.<i> Улучшения: приносит больше золота (рынок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26101": "Создать <b>катафракта</b> (‹cost›) <br>\nУникальный всадник византийцев. Эффективен против пехоты. Не эффективен против стрелков. <i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного катафракта — 1200 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26102": "Создать <b>стрелка с чо-ко-ну</b> (‹cost›) <br>\nУникальный юнит китайцев. Стрелок с очень высокой скоростью атаки. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, радиус атаки (кузница); точность (стрельбище); атака, точность (университет); скорость производства, до элитного стрелка с чо-ко-ну — 760 ед. пищи, 760 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26103": "Создать <b>мамлюка</b> (‹cost›) <br>\nУникальный юнит сарацин. Мехарист, который атакует как в ближнем бою, так и на расстоянии. Эффективен против других всадников. Не эффективен против стрелков и пикинеров.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного мамлюка — 600 ед. пищи, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26104": "Создать <b>хускарла</b> (‹cost›) <br>\nУникальный пехотинец для готов. Отличается повышенной защитой от стрел. Эффективен против построек и стрелков. Не эффективен против всадников.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного хускарла — 1200 ед. пищи, 550 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26105": "Создать <b>янычара</b> (‹cost›) <br>\nУникальный юнит турок. Кулевринер с увеличенным радиусом атаки. Может стрелять в упор. Эффективен против пехоты. Не эффективен против стрелков.<i> Улучшения: защита (кузница); скорость производства, до элитного янычара — 850 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26106": "Построить <b>драккар</b> (‹cost›) <br>\nУникальный корабль викингов. Выпускает сразу несколько стрел. Эффективен против боевых галер, наземных юнитов и построек.<i> Улучшения: защита, стоимость, скорость, до элитного драккара — 750 ед. пищи, 475 ед. золота (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26107": "Создать <b>английского лучника</b> (‹cost›) <br>\nУникальный юнит британцев. Стрелок с очень большим радиусом атаки. Эффективен против пехоты. Не эффективен против всадников и застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); скорость производства, до элитного английского лучника — 850 ед. пищи, 850 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26108": "Создать <b>мангута</b> (‹cost›) <br>\nУникальный юнит монголов. Верховой стрелок с высокой скоростью стрельбы. Эффективен против осадных орудий и пехоты. Не эффективен против застрельщиков, пикинеров и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); атака, точность (стрельбище); атака, точность (университет); скорость производства, до элитного мангута — 1100 ед. пищи, 675 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26109": "Создать <b>персидского боевого слона</b> (‹cost›) <br>\nУникальный юнит персов. Медленный и мощный всадник. Эффективен против построек и в ближнем бою. Не эффективен против монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного персидского боевого слона — 1600 ед. пищи, 1200 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26110": "Создать <b>самурая</b> (‹cost›) <br>\nУникальный юнит японцев. Пехотинец с высокой скоростью атаки. Эффективен против уникальных юнитов и пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного самурая — 950 ед. пищи, 875 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26111": "Создать <b>метателя топоров</b> (‹cost›) <br>\nУникальный юнит франков. Пехотинец, который атакует как в ближнем бою, так и на расстоянии. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного метателя топоров — 1000 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26112": "Создать <b>тевтонского рыцаря</b> (‹cost›) <br>\nУникальный юнит тевтонов. Медленный и мощный пехотинец. Эффективен в ближнем бою. Не эффективен против стрелков и скорпионов.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного тевтонского рыцаря — 1200 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26113": "Создать <b>раскрашенного разбойника</b> (‹cost›) <br>\nУникальный юнит кельтов. Быстроходный пехотинец. Эффективен против пехоты и осадных орудий. Не эффективен против стрелков и всадников.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного раскрашенного разбойника — 1000 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26114": "Создать <b>кондотьера</b> (‹cost›) <br>\nНаемный юнит итальянцев и их союзников. Быстрый пехотинец. Эффективен против юнитов с огнестрельным оружием. Не эффективен против всадников и стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26121": "Создать <b>крестьянина</b> (‹cost›) <br>\nДобывает ресурсы. Строит и ремонтирует постройки. Также ремонтирует корабли и осадные орудия.<i> Улучшения: здоровье, защита, эффективность (ратуша); добыча древесины (лесопилка); добыча камня и золота (рудник); скорость строительства (университет); атака (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26128": "Построить <b>стрельбище</b> (‹cost›) <br>\nВ нем можно обучать и улучшать стрелковые юниты.<i> Улучшения: скорость производства (замок); радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i><br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26129": "Построить <b>рибадекин</b> (‹cost›) <br>\nУникальный юнит португальцев. Осадное орудие, которое стреляет залпом пуль. Эффективно против больших групп юнитов. Не эффективно против всадников и мангонелей.<i> Улучшения: атака, радиус атаки (университет); скорость производства, до элитного рибадекина — 1200 ед. золота, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26130": "Построить <b>элитный рибадекин</b> (‹cost›) <br>\nУникальный юнит португальцев. Осадное орудие, которое стреляет залпом пуль. Эффективно против больших отрядов. Не эффективно против всадников и мангонелей.<i> Улучшения: атака, радиус атаки (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26131": "Построить <b>кузницу</b> (‹cost›) <br>\nВ ней можно изучать технологии, связанные с атакой и защитой юнитов.<b><i> Необходима для строительства инженерной мастерской.</b></i><i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26132": "Построить <b>каравеллу</b> (‹cost›) <br>\nУникальный юнит португальцев. Каждый выстрел поражает несколько юнитов сразу. Эффективна против больших групп кораблей. Не эффективна против огневых кораблей.<i> Улучшения: защита, стоимость, скорость, до элитной каравеллы — 750 ед. пищи, 475 ед. золота (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26133": "Построить <b>элитную каравеллу</b> (‹cost›) <br>\nУникальный юнит португальцев. Каждый выстрел поражает несколько юнитов сразу. Эффективна против больших групп кораблей. Не эффективна против огневых кораблей.<i> Улучшения: защита, скорость, стоимость (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26134": "Создать <b>лучника на верблюде</b> (‹cost›) <br>\nУникальный верховой стрелок берберов. Эффективен против конных лучников и пехоты. Не эффективен против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); точность, защита (стрельбище); атака, точность (университет); скорость производства, до элитного лучника на верблюде — 1000 ед. древесины, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26135": "Построить <b>казарму</b> (‹cost›) <br>\nВ ней можно обучать и улучшать пехоту.<b><i> Необходима для строительства стрельбища и конюшни.</b></i><i> Улучшения: скорость производства (замок); радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26136": "Создать <b>элитного лучника на верблюде</b> (‹cost›) <br>\nУникальный верховой стрелок берберов. Эффективен против конных лучников и пехоты. Не эффективен против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); точность, защита (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26137": "Создать <b>генитура</b> (‹cost›) <br>\nКонный застрельщик берберов и их союзников. Эффективен против стрелков. Не эффективен в ближнем бою.<i> Улучшения: скорость, здоровье (конюшня); атака, радиус атаки, защита (кузница); атака, точность (университет); точность, до элитного генитура — 500 ед. пищи, 450 ед. древесины (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26138": "Построить <b>монастырь</b> (‹cost›) <br>\nВ нем можно обучать и улучшать монахов. Реликвии, размещенные в монастыре, приносят золото. Эту постройку не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26139": "Создать <b>элитного генитура</b> (‹cost›) <br>\nКонный застрельщик берберов и их союзников. Эффективен против стрелков. Не эффективен в ближнем бою.<i> Улучшения: скорость, здоровье (конюшня); атака, радиус атаки, защита (кузница); атака, точность (университет); точность (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26140": "Создать <b>гбето</b> (‹cost›) <br>\nУникальный юнит малийцев. Быстроходный пехотинец, который атакует как в ближнем бою, так и на расстоянии. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: защита (кузница); скорость производства, до элитной гбето — 900 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26141": "Создать <b>элитную гбето</b> (‹cost›) <br>\nУникальный юнит малийцев. Быстроходный пехотинец, который атакует как в ближнем бою, так и на расстоянии. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: защита (кузница); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26142": "Построить <b>замок</b> (‹cost›) <br>\nВ нем можно обучать и улучшать уникальные юниты, строить требушеты и исследовать технологии. Автоматически ведет огонь по врагам в радиусе атаки. Юниты могут размещаться внутри, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов. Обеспечивает 20 человек населения. Эту постройку не могут обратить вражеские монахи.<i> Улучшения: скорость производства (замок); радиус обзора (ратуша); прочность, защита, точность (университет); атака, радиус атаки (кузница); атака, радиус атаки (замок).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26143": "Создать <b>амхарского воина</b> (‹cost›) <br>\nУникальный юнит эфиопов. Быстроходный пехотинец с высокой скоростью обучения и атаки. Эффективен против пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного амхарского воина — 1200 ед. пищи, 550 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26144": "Построить <b>пристань</b> (‹cost›) <br>\nС ее помощью можно строить и улучшать корабли, хранить пищу с рыбацких судов и торговать по воде с другими игроками.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26145": "Создать <b>элитного амхарского воина</b> (‹cost›) <br>\nУникальный юнит эфиопов. Быстроходный пехотинец с высокой скоростью обучения и атаки. Эффективен против пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26146": "Создать <b>слона с баллистой</b> (‹cost›) <br>\nУникальный юнит кхмеров. Слон, вооруженный скорпионом. Может валить деревья. Эффективен против пехоты и стрелков. Не эффективен против всадников и осадных орудий.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); атака, радиус атаки (университет); скорость производства, до элитного слона с баллистой — 1000 ед. пищи, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26147": "Создать <b>элитного слона с баллистой</b> (‹cost›) <br>\nУникальный юнит кхмеров. Слон, вооруженный скорпионом. Может валить деревья. Эффективен против пехоты и стрелков. Не эффективен против всадников и осадных орудий.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); атака, радиус атаки (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26148": "Создать <b>пендекара</b> (‹cost›) <br>\nУникальный юнит малайцев. Дешевый пехотинец, который считается лишь за половину единицы населения. Эффективен, если число пендекаров велико. Не эффективен против всадников и стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного пендекара — 900 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26149": "Построить <b>ферму</b> (‹cost›) <br>\nВозобновляемый источник пищи. Количество пищи на ферме ограничено. Когда она истощается, ее нужно восстанавливать. На каждой ферме может работать только один крестьянин. Ее не могут обратить вражеские монахи. Можно обрабатывать заброшенные вражеские фермы.<i> Улучшения: количество пищи (мельница); прочность (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26150": "Создать <b>элитного пендекара</b> (‹cost›) <br>\nУникальный юнит малайцев. Дешевый пехотинец, который считается лишь за половину единицы населения. Эффективен, если число пендекаров велико. Не эффективен против всадников и стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26151": "Создать <b>арамбая</b> (‹cost›) <br>\nУникальный юнит бирманцев. Верховой стрелок дротиками. Отличается мощной, но не очень точной атакой. Эффективен против пехоты и всадников. Не эффективен против стрелков.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); точность (университет); скорость производства, до элитного арамбая — 1100 ед., 675 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26152": "Создать <b>элитного арамбая</b> (‹cost›) <br>\nУникальный юнит бирманцев. Верховой стрелок дротиками. Отличается мощной, но не очень точной атакой. Эффективен против пехоты и всадников. Не эффективен против стрелков.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26154": "Построить <b>защитную башню</b> (‹cost›) <br>\nБашня, которая атакует на расстоянии. Юниты могут размещаться внутри, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов, которыми стреляет башня. Эффективна против стрелков. Не эффективна в ближнем бою, особенно против таранов.<i> Улучшения: радиус обзора (ратуша), атака, радиус атаки (кузница); атака, прочность, защита, атака против кораблей, до донжона — 500 ед. пищи, 350 ед. древесины (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26155": "Построить <b>донжон</b> (‹cost›) <br>\nБашня, которая атакует на расстоянии. Юниты могут размещаться внутри, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов, которыми стреляет башня. Эффективна против стрелков. Не эффективна в ближнем бою, особенно против таранов.<i> Улучшения: радиус обзора (ратуша); атака, радиус атаки (кузница); атака, прочность, защита, атака против кораблей (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26156": "Построить <b>пушечную башню</b> (‹cost›) <br>\nБашня, которая атакует на расстоянии. Юниты могут размещаться внутри, чтобы получить защиту. Эффективна против кораблей.<i> Улучшения: радиус обзора (ратуша), атака, радиус атаки (кузница); прочность, защита, атака против кораблей (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26157": "Построить <b>мельницу</b> (‹cost›) <br>\nС ее помощью можно хранить пищу и изучать сельскохозяйственные технологии. Лучше строить рядом с источником пищи, чтобы быстрее добывать пищу.<b><i> Необходима для строительства фермы и рынка.</b></i><i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26159": "Построить <b>факторию</b> (‹cost›) <br>\nЭкономическая постройка. Производит ресурсы и не требует наличия крестьян. Уникальная постройка португальцев. Для нее требуется 20 человек населения.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26160": "Построить <b>огневую галеру</b> (‹cost›) <br>\nВоенный корабль, который поливает огнем вражеские корабли в пределах небольшого радиуса атаки. Эффективна против галер. Не эффективна против малых брандеров.<i> Улучшения: защита, скорость, стоимость, до огневого корабля — 230 ед. пищи, 100 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26161": "Построить <b>рынок</b> (‹cost›) <br>\nНа нем можно покупать и продавать ресурсы, торговать по суше с другими игроками и изучать технологии, связанные с торговлей. Необходим для отправки ресурсов другим игрокам. Позволяет вам видеть радиус обзора ваших союзников.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26162": "Построить <b>малый брандер</b> (‹cost›) <br>\nКорабль, наполненный взрывчаткой. Эффективен против огневых галер. Наносит урон при самоуничтожении.<i> Улучшения: защита, скорость, стоимость, до брандера — 230 ед. пищи, 100 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26164": "Построить <b>ратушу</b> (‹cost›) <br>\nС его помощью можно обучать крестьян, хранить ресурсы, переходить в новые эпохи и изучать технологии. Юниты могут размещаться внутри, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов. Обеспечивает 5 человек населения. Эту постройку не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита, точность (университет); атака (кузница).</i><br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26165": "Создать <b>лучника с ротангом</b> (‹cost›) <br>\nУникальный юнит вьетнамцев. Стрелок с улучшенной защитой от стрел. Эффективен против стрелков и пехоты. Не эффективен против всадников и застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); точность, защита (стрельбище); атака, точность (университет); скорость производства, до элитного лучника с ротангом — 1000 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26166": "Создать <b>элитного лучника с ротангом</b> (‹cost›) <br>\nУникальный юнит вьетнамцев. Стрелок с улучшенной защитой от стрел. Эффективен против стрелков и пехоты. Не эффективен против всадников и застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); точность, защита (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26167": "Создать <b>боевого слона</b> (‹cost›) <br>\nМедленный тяжелый верховой юнит. Эффективен против всадников, пехотинцев и стрелков. Не эффективен против монахов и пикинеров.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до элитного боевого слона — 1200 ед. пищи, 900 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26168": "Создать <b>элитного боевого слона</b> (‹cost›) <br>\nМедленный тяжелый верховой юнит. Эффективен против всадников, пехотинцев и стрелков. Не эффективен против монахов и пикинеров.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26169": "Построить <b>инженерную мастерскую</b> (‹cost›) <br>\nВ ней можно строить осадные орудия.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26171": "Построить <b>конюшню</b> (‹cost›) <br>\nВ ней можно обучать и улучшать всадников.<i> Улучшения: скорость производства (замок); радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26176": "Построить <b>университет</b> (‹cost›) <br>\nВ нем можно изучать технологии для улучшения построек и юнитов.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26178": "Построить <b>смотровую вышку</b> (‹cost›) <br>\nБашня, которая атакует на расстоянии. Юниты могут размещаться внутри, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов, которыми стреляет башня. Эффективна против стрелков. Не эффективна в ближнем бою, особенно против таранов.<i> Улучшения: радиус обзора (ратуша); атака, радиус атаки (кузница); атака, прочность, защита, атака против кораблей, до защитной башни — 100 ед. пищи, 250 ед. древесины (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26182": "Построить <b>чудо света</b> (‹cost›) <br>\nПостроить чудо света — значит продемонстрировать превосходство вашей цивилизации. Чудо света, которое простоит определенный отрезок времени, — один из способов одержать победу. Эту постройку не могут обратить вражеские монахи.<br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26185": "Построить <b>ворота</b> (‹cost›) <br>\nМожно построить в уже существующей стене. Через них могут проходить дружественные юниты. Ворота можно открывать и закрывать вручную. Их не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет). Изучение укрепленной стены (университет) повышает прочность ворот.</i> <br>\n‹hp›",
            "26186": "Построить <b>бревенчатые ворота</b> (‹cost›) <br>\nМожно построить в уже существующей стене. Через них могут проходить дружественные юниты. Ворота можно открывать и закрывать вручную. Их не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет).</i> <br>\n‹hp›",
            "26190": "Создать <b>имперского застрельщика</b> (‹cost›) <br>\nСтрелковый юнит вьетнамцев и их союзников. Не может атаковать в ближнем бою. Эффективен против стрелков.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); точность (стрельбище); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26202": "Построить <b>частокол</b> (‹cost›) <br>\nДешевая стена из дерева, которую можно быстро построить. Задерживает врагов и помогает вам узнать об их приближении. Эту стену не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26203": "Построить <b>каменную стену</b> (‹cost›) <br>\nСтена из камня, которую сложно пробить без помощи осадных орудий. Задерживает врагов и помогает вам узнать об их приближении. Эту стену не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита, до укрепленной стены — 200 ед. пищи, 100 ед. дерева (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26204": "Построить <b>укрепленную стену</b> (‹cost›) <br>\nСтена из камня, которую сложно пробить без помощи осадных орудий. Задерживает врагов и помогает вам узнать об их приближении. Эту стену не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26287": "Построить <b>военный галеон</b> (‹cost›) <br>\nОсадный военный корабль с большим радиусом атаки, применяется против построек. Не может атаковать в ближнем бою. Эффективен против построек. Не эффективен против остальных юнитов.<i> Улучшения: защита, стоимость, скорость, до элитного военного галеона — 525 ед. древесины, 500 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26288": "Создать <b>конника</b> (‹cost›) <br>\nУникальный всадник болгар. Если лошадь убита, конник сражается как пехотинец. Эффективен против пехоты и стрелков. Не эффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного конника — 1000 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26289": "Построить <b>крытый таран</b> (‹cost›) <br>\nОсадное орудие, применяется против построек. Устойчиво к большинству атак на расстоянии. Размещенная внутри пехота увеличивает скорость и улучшает атаку.<i> Улучшения: атака (университет); до осадного тарана — 1000 ед. пищи (инженерная мастерская); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26290": "Создать <b>элитного конника</b> (‹cost›) <br>\nУникальный всадник болгар. Если лошадь убита, конник сражается как пехотинец. Эффективен против пехоты и стрелков. Не эффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26309": "Построить <b>галеон</b> (‹cost›) <br>\nУниверсальный военный корабль, который атакует на расстоянии. Не эффективен против огневых кораблей.<i> Улучшения: защита, стоимость, скорость (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26313": "Создать <b>кэшика</b> (‹cost›) <br>\nУникальный всадник татар. Приносит золото, сражаясь с другими юнитами.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного кэшика — 700 ед. пищи, 900 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26314": "Создать <b>элитного кэшика</b> (‹cost›) <br>\nУникальный всадник татар. Приносит золото, сражаясь с другими юнитами.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26315": "Создать <b>кипчака</b> (‹cost›) <br>\nУникальный юнит половцев. Верховой стрелок с высокой скоростью атаки. Эффективен против пехоты. Не эффективен против застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); точность, защита (стрельбище); атака, точность (университет); скорость производства, до элитного кипчака — 1100 ед. пищи, 1000 ед. древесины (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26326": "Создать <b>конного разведчика</b> (‹cost›) <br>\nБыстрый всадник для разведки и налетов. Устойчив к обращению. Эффективен против монахов. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до легкого кавалериста — 150 ед. пищи, 50 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26327": "Создать <b>элитного кипчака</b> (‹cost›) <br>\nУникальный юнит половцев. Верховой стрелок с высокой скоростью атаки. Эффективен против пехоты. Не эффективен против застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); точность, защита (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26328": "Создать <b>лейти</b> (‹cost›) <br>\nУникальный юнит литовцев. Тяжелый всадник, который пробивает защиту противника. Эффективен против юнитов в доспехах.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного лейти — 750 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26329": "Создать <b>элитного лейти</b> (‹cost›) <br>\nУникальный юнит литовцев. Тяжелый всадник, который пробивает защиту противника. Эффективен против юнитов в доспехах.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26344": "Построить <b>дом</b> (‹cost›) <br>\nКаждый дом обеспечивает 5 человек населения. Соотношение текущей и максимально допустимой численности населения показано в верхней части экрана.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26349": "Построить <b>крепость</b> (‹cost›) <br>\nУникальная постройка болгар. В этом укреплении можно создавать уникальные юниты. Юниты могут размещаться внутри постройки, чтобы получить защиту. Размещенные стрелки и крестьяне увеличивают число снарядов. Эту постройку не могут обратить вражеские монахи.<i> Улучшения: скорость производства (замок); радиус обзора (ратуша); прочность, защита, точность (университет); атака, радиус атаки (кузница).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26375": "Создать <b>совара</b> (‹cost›) <br>\nПоджигаемый верблюд, нагруженный горючим сеном и хворостом. Эффективен против верховых юнитов, особенно слонов. Не эффективен против стрелков и пехоты. Самоуничтожается при использовании.<i> Улучшения: атака (университет); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26381": "Построить <b>требушет</b> (‹cost›) <br>\nМощное осадное орудие с большим радиусом атаки, применяется против построек. Не может атаковать в ближнем бою. Перевозится в свернутом виде, для стрельбы его нужно развернуть. Может валить деревья. Эффективно против построек.<i> Улучшения: атака, радиус атаки (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26408": "Создать <b>пикинера</b> (‹cost›) <br>\nПехотный юнит для борьбы со всадниками. Эффективен против всадников, особенно слонов. Не эффективен против стрелков и пехоты.<i> Улучшения: атака, защита (кузница); скорость, до алебардиста — 300 ед. пищи, 600 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26409": "Создать <b>алебардиста</b> (‹cost›) <br>\nПехотный юнит для борьбы со всадниками. Эффективен против всадников, особенно слонов. Не эффективен против стрелков и пехоты.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26411": "Создать <b>воина с двуручным мечом</b> (‹cost›) <br>\nУниверсальный пехотный юнит. Эффективен против построек и пехоты. Не эффективен против стрелков на большой дистанции.<i> Улучшения: атака, защита (кузница); стоимость, скорость, до чемпиона — 750 ед. пищи, 350 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26412": "Создать <b>тяжелого конного лучника</b> (‹cost›) <br>\nВерховой стрелок. Эффективен против медленных юнитов на большом расстоянии. Не эффективен против элитных застрельщиков и в ближнем бою.<i> Улучшения: атака, радиус атаки, защита (кузница); точность, защита (стрельбище); атака, точность (университет); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26416": "Создать <b>мехариста</b> (‹cost›) <br>\nБыстрый юнит для борьбы со всадниками. Эффективен против всадников. Не эффективен против копейщиков, монахов и стрелков.<i> Улучшения: атака, защита (кузница); скорость, до тяжелого мехариста — 325 ед. пищи, 360 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26417": "Создать <b>тяжелого мехариста</b> (‹cost›) <br>\nБыстрый юнит для борьбы со всадниками. Эффективен против всадников. Не эффективен против пикинеров, монахов и стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до имперского мехариста — 1200 ед. пищи, 600 ед. золота (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26418": "Создать <b>арбалетчика</b> (‹cost›) <br>\nСтрелковый юнит. Эффективен в атаках на расстоянии. Не эффективен против элитных застрельщиков и онагров, а также в ближнем бою.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26419": "Создать <b>имперского мехариста</b> (‹cost›) <br>\nУникальный юнит индийцев. Быстроходный всадник для борьбы со всадниками. Эффективен против всадников. Не эффективен против пикинеров, монахов и стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26424": "Построить <b>брандер</b> (‹cost›) <br>\nКорабль, наполненный взрывчаткой. Эффективен против огневых кораблей и построек. Наносит урон при самоуничтожении.<i> Улучшения: защита, скорость, стоимость, до тяжелого брандера — 200 ед. древесины, 300 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26425": "Построить <b>тяжелый брандер</b> (‹cost›) <br>\nКорабль, наполненный взрывчаткой. Эффективен против огневых кораблей и построек. Наносит урон при самоуничтожении.<i> Улучшения: защита, скорость, стоимость (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26426": "Построить <b>огневой корабль</b> (‹cost›) <br>\nВоенный корабль, который поливает огнем вражеские корабли в пределах небольшого радиуса атаки. Эффективен против боевых галер. Не эффективен против брандеров.<i> Улучшения: защита, скорость, стоимость, до быстрого огневого корабля — 280 ед. древесины, 250 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26429": "Построить <b>быстрый огневой корабль</b> (‹cost›) <br>\nВоенный корабль, который поливает огнем вражеские корабли в пределах небольшого радиуса атаки. Эффективен против боевых галер. Не эффективен против брандеров.<i> Улучшения: защита, скорость, стоимость (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26436": "Построить <b>галеру</b> (‹cost›) <br>\nУниверсальный военный корабль, который атакует на расстоянии. Не эффективен против огневых галер.<i> Улучшения: защита, стоимость, скорость, до боевой галеры — 230 ед. пищи, 100 ед. золота (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26439": "Построить <b>тяжелый скорпион</b> (‹cost›) <br>\nОсадное орудие, стреляющее снарядами в форме копья. Эффективно против крупных отрядов, так как наносит урон сразу нескольким целям. Не эффективно против всадников и осадных орудий.<i> Улучшения: атака, радиус атаки (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26443": "Построить <b>транспортный корабль</b> (‹cost›) <br>\nКорабль для перевозки юнитов по воде. Выберите юниты и щелкните правой кнопкой мыши по транспортному кораблю, чтобы погрузить их на судно. Нажмите кнопку «Разгрузить», чтобы высадить юниты на берег.<i> Улучшения: защита, скорость, стоимость, грузоподъемность (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26444": "Создать <b>легкого кавалериста</b> (‹cost›) <br>\nБыстрый всадник для разведки и налетов. Устойчив к обращению. Эффективен против монахов. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье, до гусара — 500 ед. пищи, 600 ед. золота (конюшня); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26445": "Построить <b>осадную башню</b> (‹cost›) <br>\nБыстрый наземный транспорт, с которого можно высаживать юниты на вражеские стены. Устойчива к атакам стрелков. Внутри башни нельзя размещать верховые юниты.<i> Улучшения: больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26446": "Построить <b>осадный таран</b> (‹cost›) <br>\nОсадное орудие, применяется против построек. Устойчиво к большинству атак на расстоянии. Размещенная внутри пехота увеличивает скорость и улучшает атаку.<i> Улучшения: атака (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26447": "Создать <b>боярина</b> (‹cost›) <br>\nУникальный всадник славян. Устойчив к атакам в ближнем бою.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного боярина — 1000 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ",
            "26448": "Построить <b>онагр</b> (‹cost›) <br>\nСтрелковое осадное орудие. Наносит урон по площади, но не может атаковать в ближнем бою. Эффективно против плотных групп юнитов. Может валить деревья.<i> Улучшения: атака, радиус атаки (университет); до осадного онагра — 1450 ед. пищи, 1000 ед. золота (инженерная мастерская); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26449": "Создать <b>элитного боярина</b> (‹cost›) <br>\nУникальный всадник славян. Устойчив к атакам в ближнем бою.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26451": "Создать <b>элитного катафракта</b> (‹cost›) <br>\nУникальный всадник византийцев. Эффективен против пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26452": "Создать <b>элитного стрелка с чо-ко-ну</b> (‹cost›) <br>\nУникальный юнит китайцев. Стрелок с очень высокой скоростью атаки. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26453": "Создать <b>элитного мамлюка</b> (‹cost›) <br>\nУникальный юнит сарацин. Мехарист, который атакует как в ближнем бою, так и на расстоянии. Эффективен против других всадников. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26454": "Создать <b>элитного хускарла</b> (‹cost›) <br>\nУникальный пехотинец для готов. Отличается повышенной защитой от стрел. Эффективен против построек и стрелков. Не эффективен против всадников.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26455": "Создать <b>элитного янычара</b> (‹cost›) <br>\nУникальный юнит турок. Кулевринер с увеличенным радиусом атаки. Может стрелять в упор. Эффективен против пехоты. Не эффективен против стрелков.<i> Улучшения: защита (кузница); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26456": "Создать <b>элитного английского лучника</b> (‹cost›) <br>\nУникальный юнит британцев. Эффективный стрелок с очень большим радиусом атаки. Эффективен против пехоты. Не эффективен против всадников и застрельщиков.<i> Улучшения: атака, радиус атаки, защита (кузница); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26457": "Построить <b>элитный драккар</b> (‹cost›) <br>\nУникальный корабль викингов. Выпускает сразу несколько стрел. Эффективен против боевых галер, наземных юнитов и построек.<i> Улучшения: защита, стоимость, скорость (пристань); атака, радиус атаки (кузница); атака, точность (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26458": "Создать <b>элитного мангута</b> (‹cost›) <br>\nУникальный юнит монголов. Верховой стрелок с высокой скоростью стрельбы. Эффективен против осадных орудий и пехоты. Не эффективен против застрельщиков, пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); атака, точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26459": "Создать <b>элитного персидского боевого слона</b> (‹cost›) <br>\nУникальный юнит персов. Медленный и мощный всадник. Эффективен против построек и в ближнем бою. Не эффективен против монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26460": "Создать <b>элитного самурая</b> (‹cost›) <br>\nУникальный юнит японцев. Пехотинец с высокой скоростью атаки. Эффективен против уникальных юнитов и пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26461": "Создать <b>элитного метателя топоров</b> (‹cost›) <br>\nУникальный юнит франков. Пехотинец, который атакует как в ближнем бою, так и на расстоянии. Эффективен против пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26462": "Создать <b>элитного тевтонского рыцаря</b> (‹cost›) <br>\nУникальный юнит тевтонов. Медленный и мощный пехотинец. Эффективен в ближнем бою. Не эффективен против стрелков и скорпионов.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26463": "Создать <b>элитного раскрашенного разбойника</b> (‹cost›) <br>\nУникальный юнит кельтов. Быстроходный пехотинец. Эффективен против пехоты и осадных орудий. Не эффективен против стрелков и всадников.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26464": "Построить <b>лесопилку</b> (‹cost›) <br>\nС ее помощью можно хранить древесину и изучать технологии, связанные со сбором этого ресурса. Лучше строить рядом с лесом, чтобы быстрее добывать древесину.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26469": "Создать <b>чемпиона</b> (‹cost›) <br>\nУниверсальный пехотный юнит. Эффективен против построек и пехоты. Не эффективен против стрелков на большом расстоянии.<i> Улучшения: атака, защита (кузница); стоимость, скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26471": "Создать <b>паладина</b> (‹cost›) <br>\nУниверсальный мощный всадник. Эффективен против пехоты и стрелков. Не эффективен против алебардистов, тяжелых мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26487": "Построить <b>рудник</b> (‹cost›) <br>\nС его помощью можно хранить золото и камень, а также изучать технологии, связанные с добычей полезных ископаемых. Лучше строить рядом с месторождениями, чтобы быстрее добывать камень и золото.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26493": "Построить <b>осадный онагр</b> (‹cost›) <br>\nСтрелковое осадное орудие. Наносит урон по площади, но не может атаковать в ближнем бою. Эффективно против плотных групп юнитов. Может валить деревья.<i> Улучшения: атака, радиус атаки (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26495": "Построить <b>невод</b> (‹cost›) <br>\nВозобновляемый источник пищи. Похож по принципу на ферму, только располагается в воде. Неводы устанавливают с помощью рыбацких судов. Количество пищи с невода ограничено. Когда он приходит в негодность, его нужно восстанавливать. Его не могут обратить вражеские монахи.<i> Улучшения: радиус обзора (ратуша); прочность (университет).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26504": "Построить <b>заставу</b> (‹cost›) <br>\nНаблюдательный пункт с большим радиусом обзора. Помогает заметить приближающегося врага. В отличие от других башен, застава не обстреливает противника, и внутри нее нельзя размещать юниты.<i> Улучшения: радиус обзора (ратуша); прочность, защита (университет); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26534": "Создать <b>кутилье</b> (‹cost›) <br>\nУникальный всадник бургундцев, способный накапливать силу атаки. Эффективен против пехоты и стрелков. Неэффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного кутилье — 1000 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26536": "Создать <b>элитного кутилье</b> (‹cost›) <br>\nУникальный всадник бургундцев, способный накапливать силу атаки. Эффективен против пехоты и стрелков. Неэффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26538": "Создать <b>сержанта</b> (‹cost›) <br>\nУникальный пехотинец сицилийцев, может строить башни-замки.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного сержанта — 1100 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26540": "Создать <b>элитного сержанта</b> (‹cost›) <br>\nУникальный пехотинец сицилийцев, может строить башни-замки.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26542": "Создать <b>фламандского ополченца</b> (‹cost›) <br>\nУникальный пехотинец бургундцев. Эффективен против всадников. Неэффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26544": "Построить <b>башню-замок</b> (‹cost›) <br>\nУникальная постройка сицилийцев. В этом укреплении можно создавать уникальные юниты. Юниты могут размещаться внутри постройки, чтобы получить защиту. Размещенные стрелки и поселенцы увеличивают число снарядов.<i> Улучшения: скорость производства (замок); радиус обзора (городской совет); прочность, защита, точность (университет); атака, радиус атаки (кузница).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range› ‹garrison›",
            "26573": "Построить <b>элитный военный галеон</b> (‹cost›) <br>\nОсадный военный корабль, применяется против построек. Отличается большим радиусом атаки, но не может атаковать в ближнем бою. Эффективен против построек. Не эффективен против остальных юнитов.<i> Улучшения: защита, стоимость, скорость (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26574": "Создать <b>берсерка</b> (‹cost›) <br>\nУникальный юнит викингов. Пехотинец, который медленно излечивает себя. Эффективен против пехоты и осадных орудий. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного берсерка — 1300 ед. пищи, 550 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26576": "Создать <b>элитного берсерка</b> (‹cost›) Уникальный юнит викингов. Пехотинец, который медленно излечивает себя. Эффективен против пехоты и осадных орудий. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26660": "Создать <b>подрывника</b> (‹cost›) <br>\nСаперный пехотинец, вооруженный взрывчаткой. Эффективен против построек. Не эффективен против других юнитов. Наносит урон при самоуничтожении.<i> Улучшения: атака (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26661": "Создать <b>гусара</b> (‹cost›) <br>\nБыстрый всадник для разведки и налетов. Устойчив к обращению. Эффективен против монахов. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26667": "Создать <b>воина-ягуара</b> (‹cost›) <br>\nУникальный пехотинец ацтеков. Эффективен против пехоты. Не эффективен против всадников и стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного воина-ягуара — 1000 ед. пищи, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26669": "Создать <b>элитного воина-ягуара</b> (‹cost›) <br>\nУникальный пехотинец ацтеков. Эффективен против пехоты. Не эффективен против всадников и стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26671": "Создать <b>воина-орла</b> (‹cost›) <br>\nБыстрый пехотинец для разведки и налетов. Устойчив к обращению. Эффективен против монахов и стрелков. Не эффективен против воинов с длинным мечом и всадников.<i> Улучшения: атака, защита (кузница); скорость, до элитного воина-орла — 800 ед. пищи, 500 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26672": "Создать <b>орла-разведчика</b> (‹cost›) <br>\nБыстрый пехотинец для разведки и налетов. Устойчив к обращению. Эффективен против монахов и стрелков. Не эффективен против ополченцев с мечом и всадников.<i> Улучшения: атака, защита (кузница); скорость, до воина-орла — 200 ед. пищи, 200 ед. золота (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26673": "Создать <b>элитного воина-орла</b> (‹cost›) <br>\nБыстрый пехотинец для разведки и налетов. Устойчив к обращению. Эффективен против монахов и стрелков. Не эффективен против воинов с длинным мечом и всадников.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26675": "Создать <b>таркана</b> (‹cost›) <br>\nУникальный всадник гуннов. Эффективен против построек и стрелков. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного таркана — 1000 ед. пищи, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26677": "Создать <b>элитного таркана</b> (‹cost›) <br>\nУникальный всадник гуннов. Эффективен против построек и стрелков. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26682": "Создать <b>лучника на слоне</b> (‹cost›) <br>\nУникальный верховой стрелок индийцев. Эффективен против стрелков и пехоты. Не эффективен против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); точность (стрельбище); атака, точность (университет); скорость производства, улучшение до элитного лучника на слоне — 1000 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26683": "Создать <b>лучника-холькана</b> (‹cost›) <br>\nУникальный юнит майя. Быстроходный стрелок. Эффективен против стрелков и пехоты. Не эффективен против всадников.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства, до элитного лучника-холькана — 700 ед. пищи, 1000 ед. древесины (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26684": "Создать <b>элитного лучника на слоне</b> (‹cost›) <br>\nУникальный верховой стрелок индийцев. Эффективен против стрелков и пехоты. Не эффективен против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость, здоровье (конюшня); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26685": "Создать <b>элитного лучника-холькана</b> (‹cost›) <br>\nУникальный юнит майя. Быстроходный стрелок. Эффективен против стрелков и пехоты. Не эффективен против всадников.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26686": "Создать <b>камаюка</b> (‹cost›) <br>\nУникальный копейщик инков. Отличается увеличенным радиусом атаки. Эффективен против всадников и пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства, до элитного камаюка — 900 ед. пищи, 500 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26687": "Создать <b>конкистадора</b> (‹cost›) <br>\nУникальный верховой кулевринер испанцев. Эффективен против пехоты. Не эффективен против пикинеров, застрельщиков и монахов.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного конкистадора — 1200 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26688": "Создать <b>элитного камаюка</b> (‹cost›) <br>\nУникальный копейщик инков. Отличается увеличенным радиусом атаки. Эффективен против всадников и пехоты. Не эффективен против стрелков.<i> Улучшения: атака, защита (кузница); скорость (казарма); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26689": "Создать <b>элитного конкистадора</b> (‹cost›) <br>\nУникальный верховой кулевринер испанцев. Эффективен против пехоты. Не эффективен против пикинеров, застрельщиков и монахов.<i> Улучшения: защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26690": "Создать <b>пращника</b> (‹cost›) <br>\nУникальный юнит инков. Стрелок для борьбы с пехотой. Не может атаковать в ближнем бою. Эффективен против пехоты. Не эффективен против стрелков и всадников.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26691": "Создать <b>миссионера</b> (‹cost›) <br>\nУникальный верховой монах испанцев. От монаха отличается большей скоростью, но меньшим радиусом обзора и атаки. Как и монах, может восстанавливать здоровье дружественных юнитов и обращать вражеских, но не может подбирать реликвии. Эффективен против медленных юнитов с холодным оружием. Не эффективен против легкой кавалерии и стрелков.<i> Улучшения: в монастыре.</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26723": "Создать <b>генуэзского арбалетчика</b> (‹cost›) <br>\nУникальный стрелок итальянцев. Эффективен против всадников и пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства, до элитного генуэзского арбалетчика — 1000 ед. пищи, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26725": "Создать <b>элитного генуэзского арбалетчика</b> (‹cost›) <br>\nУникальный стрелок итальянцев. Эффективен против всадников и пехоты. Не эффективен против стрелков и осадных орудий.<i> Улучшения: атака, радиус атаки, защита (кузница); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26727": "Создать <b>боевую телегу</b> (‹cost›) <br>\nУникальный верховой стрелок корейцев. Эффективна против пехоты и стрелков. Не эффективна против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость (конюшня); точность (стрельбище); атака, точность (университет); скорость производства, до элитной боевой телеги — 1000 ед. древесины, 800 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26728": "Создать <b>мадьярского гусара</b> (‹cost›) <br>\nУникальный юнит венгров. Легкая кавалерия. Эффективен против осадных орудий. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного мадьярского гусара — 800 ед. пищи, 600 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26729": "Создать <b>элитную боевую телегу</b> (‹cost›) <br>\nУникальный верховой стрелок корейцев. Эффективна против пехоты и стрелков. Не эффективна против пикинеров, застрельщиков и мехаристов.<i> Улучшения: атака, радиус атаки, защита (кузница); скорость (конюшня); точность (стрельбище); атака, точность (университет); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26730": "Создать <b>элитного мадьярского гусара</b> (‹cost›) <br>\nУникальный юнит венгров. Легкая кавалерия. Эффективен против осадных орудий. Не эффективен против пикинеров и мехаристов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26731": "Построить <b>корабль-черепаху</b> (‹cost›) <br>\nУникальный юнит корейцев. Медленный военный корабль с железной обшивкой. Эффективен против боевых кораблей и построек.<i> Улучшения: защита, скорость, стоимость, до элитного корабля-черепахи — 1000 ед. пищи, 800 ед. золота (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "26732": "Построить <b>элитный корабль-черепаху</b> (‹cost›) <br>\nУникальный юнит корейцев. Медленный военный корабль с железной обшивкой. Эффективен против боевых кораблей и построек.<i> Улучшения: защита, скорость, стоимость (пристань); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "28008": "Изучить <b>городскую стражу</b> (‹cost›) <br>\nРадиус обзора всех построек выше на 4 единицы. Вы сможете раньше заметить приближение врагов.",
            "28012": "Изучить <b>севооборот</b> (‹cost›) <br>\nФермы производят на 175 ед. пищи больше, и у них повышается срок службы.",
            "28013": "Изучить <b>тяжелый плуг</b> (‹cost›) <br>\nФермы производят на 125 ед. пищи больше, и у них повышается срок службы. За каждый поход крестьяне уносят на 1 ед. пищи больше.",
            "28014": "Изучить <b>хомут</b> (‹cost›) <br>\nФермы производят на 75 пищи больше, и у них повышается срок службы.",
            "28015": "Изучить <b>цехи</b> (‹cost›) <br>\nНа 15% ниже пошлина за торговлю товарами.",
            "28017": "Изучить <b>банковское дело</b> (‹cost›) <br>\nДань не облагается пошлиной.",
            "28019": "Изучить <b>картографию</b> (‹cost›) <br>\nУ вас и ваших союзников общий радиус обзора (вы видите то, что видят они).",
            "28022": "Изучить <b>ткачество</b> (‹cost›) <br>\nКрестьяне становятся менее уязвимыми: каждый из них получает +15 очков здоровья, +1 к защите и +2 к защите от стрел.",
            "28023": "Изучить <b>чеканку монет</b> (‹cost›) <br>\nПошлина с дани снижается до 20%.",
            "28039": "Изучить <b>коневодство</b> (‹cost›) <br>\nВсадники передвигаются на 10% быстрее.",
            "28045": "Изучить <b>веру</b> (‹cost›) <br>\nВражеским монахам становится на 50% труднее обратить ваших юнитов.",
            "28047": "Изучить <b>химию</b> (‹cost›) <br>\nСила атаки стрелковых юнитов (кроме юнитов с огнестрельным оружием) увеличивается на 1.<b><i> Эта технология требуется для<br>\nсоздания юнитов с огнестрельным оружием (кулевринер, <br>\nвоенный галеон, бомбарда, пушечная башня).</b></i>",
            "28050": "Изучить <b>каменную кладку</b> (‹cost›) <br>\nВсе постройки укрепляются: +10% к прочности, +1 к защите, +1 к защите от стрел, +3 к защите построек.",
            "28051": "Изучить <b>архитектуру</b> (‹cost›) <br>\nВсе постройки укрепляются: +10% к прочности, +1 к защите, +1 к защите от стрел, +3 к защите построек.",
            "28054": "Изучить <b>подъемный кран</b> (‹cost›) <br>\nКрестьяне возводят постройки на 20% быстрее.",
            "28055": "Изучить <b>золотодобычу</b> (‹cost›) <br>\nКрестьяне добывают золото на 15% быстрее.",
            "28059": "Изучить <b>катапаруто</b> (‹cost›) <br>\nТребушеты быстрее сворачиваются и разворачиваются.",
            "28063": "Улучшить до <b>донжона</b> (‹cost›) <br>\nЗащитные башни улучшаются. Вы сможете строить донжоны, у которых лучше защита, больше сила и радиус атаки.",
            "28067": "Изучить <b>ковку</b> (‹cost›) <br>\nУ пехоты и кавалерии сила атаки увеличивается на 1.",
            "28068": "Изучить <b>чугунное литье</b> (‹cost›) <br>\nУ пехотинцев и всадников сила атаки увеличивается на 1.",
            "28074": "Изучить <b>ламеллярные доспехи</b> (‹cost›) <br>\nЗащита пехоты улучшается: +1 к защите и +1 к защите от стрел.",
            "28075": "Изучить <b>доменную печь</b> (‹cost›) <br>\nУ пехотинцев и всадников сила атаки увеличивается на 2.",
            "28076": "Изучить <b>кольчугу</b> (‹cost›) <br>\nЗащита пехоты улучшается: +1 к защите и +1 к защите от стрел.",
            "28077": "Изучить <b>пластинчатые доспехи</b> (‹cost›) <br>\nЗащита пехоты улучшается: +1 к защите и +2 к защите от стрел.",
            "28080": "Изучить <b>пластинчатые доспехи для коня</b> (‹cost›) <br>\nЗащита всадников улучшается: +1 к защите и +2 к защите от стрел.",
            "28081": "Изучить <b>ламеллярные доспехи для коня</b> (‹cost›) <br>\nЗащита всадников улучшается: +1 к защите и +1 к защите от стрел.",
            "28082": "Изучить <b>кольчужную попону</b> (‹cost›) <br>\nЗащита всадников улучшается: +1 к защите и +1 к защите от стрел.",
            "28090": "Изучить <b>слежку</b> (‹cost›) <br>\nТеперь пехотинцы видят врагов на большем расстоянии: +2 к их радиусу обзора.",
            "28093": "Изучить <b>баллистику</b> (‹cost›) <br>\nПешие и верховые стрелки, ратуши, замки, галеры и уникальные морские юниты точнее атакуют движущиеся цели.",
            "28101": "Перейти в <b>феодальную эпоху</b> (‹cost›; две постройки темной эпохи) <br>\nШаг вперед для вашей цивилизации. Вы получаете доступ к различным постройкам, более мощным военным юнитам и передовым технологиям. Чтобы перейти в следующую эпоху, вы должны возвести любые две постройки темной эпохи: лесопилка, рудник, мельница, пристань или казарма.",
            "28102": "Перейти в <b>замковую эпоху</b> (‹cost›; две постройки феодальной эпохи) <br>\nШаг вперед для вашей цивилизации. Вы получаете доступ к различным постройкам, более мощным военным юнитам и передовым технологиям. Чтобы перейти в следующую эпоху, вы должны возвести любые две постройки феодальной эпохи: стрельбище, конюшню, кузницу или рынок.",
            "28103": "Перейти в <b>имперскую эпоху</b> (‹cost›; две постройки замковой эпохи — либо замок или крепость) <br>\nШаг вперед для вашей цивилизации. Вы получаете доступ к различным постройкам, более мощным военным юнитам и передовым технологиям. Чтобы перейти в следующую эпоху, вы должны возвести замок или крепость либо любые две постройки замковой эпохи: университет, инженерную мастерскую или монастырь.",
            "28150": "Изучить <b>игловидные наконечники</b> (‹cost›) <br>\nПешие и верховые стрелки, галеры, замки и башни улучшаются: +1 к атаке и +1 к радиусу атаки. Городские советы получают +1 к атаке.",
            "28151": "Изучить <b>наручи</b> (‹cost›) <br>\nПешие и верховые стрелки, галеры, замки и башни улучшаются: +1 к атаке и +1 к радиусу атаки. Городские советы получают +1 к атаке.",
            "28163": "Улучшить до <b>укрепленной стены</b> (‹cost›) <br>\nКаменные стены улучшаются. Вы сможете строить более мощные укрепленные стены, которые труднее сломать. Повышается и прочность ворот.",
            "28172": "Изучить <b>оперение стрел</b> (‹cost›) <br>\nПешие и верховые стрелки, галеры, замки и башни улучшаются: +1 к атаке и +1 к радиусу атаки. Городские советы получают +1 к атаке.",
            "28180": "Изучить <b>золотые рудники</b> (‹cost›) <br>\nКрестьяне добывают золото на 15% быстрее.",
            "28186": "Улучшить до <b>защитной башни</b> (‹cost›) <br>\nСмотровые вышки улучшаются. Вы сможете строить более мощные защитные башни, сила атаки которых выше.",
            "28189": "Изучить <b>двуострый топор</b> (‹cost›) <br>\nКрестьяне добывают древесину на 20% быстрее.",
            "28190": "Изучить <b>лучковую пилу</b> (‹cost›) <br>\nКрестьяне добывают древесину на 20% быстрее.",
            "28208": "Изучить <b>стеганые доспехи для стрелков</b> (‹cost›) <br>\nПешие и верховые стрелки улучшаются: +1 к защите и +1 к защите от стрел.",
            "28209": "Изучить <b>кожаные доспехи для стрелков</b> (‹cost›) <br>\nПешие и верховые стрелки улучшаются: +1 к защите и +1 к защите от стрел.",
            "28210": "Изучить <b>оруженосцев</b> (‹cost›) <br>\nПехота передвигается на 10% быстрее.",
            "28211": "Изучить <b>тачку</b> (‹cost›) <br>\nКрестьяне передвигаются на 10% быстрее и переносят на 25% больше ресурсов.",
            "28216": "Изучить <b>кольчугу для стрелков</b> (‹cost›) <br>\nПешие и верховые стрелки улучшаются: +1 к защите и +2 к защите от стрел.",
            "28220": "Изучить <b>вдохновение</b> (‹cost›) <br>\nПосле удачного обращения монахи восстанавливают веру на 50% быстрее.",
            "28221": "Изучить <b>святость</b> (‹cost›) <br>\nМонахи становятся менее уязвимыми: каждый из них получает на 50% больше очков здоровья.",
            "28222": "Изучить <b>ксилографию</b> (‹cost›) <br>\nРадиус обращения у монахов увеличивается на 3 единицы.",
            "28231": "Изучить <b>двуручную пилу</b> (‹cost›) <br>\nКрестьяне добывают древесину на 10% быстрее.",
            "28246": "Изучить <b>ручную тележку</b> (‹cost›) <br>\nКрестьяне передвигаются на 10% быстрее и переносят на 50% больше ресурсов.",
            "28249": "Изучить <b>рвение</b> (‹cost›) <br>\nМонахи передвигаются на 15% быстрее.",
            "28250": "Изучить <b>каракку</b> (‹cost›) <br>\nКорабли улучшаются: +1 к защите и +1 к защите от стрел.",
            "28251": "Изучить <b>аркебузу</b> (‹cost›) <br>\nТехнология «Баллистика» влияет и на юнитов с огнестрельным оружием.",
            "28252": "Изучить <b>королевских наследников</b> (‹cost›) <br>\nАмхарские воины создаются почти мгновенно.",
            "28253": "Изучить <b>торсионные механизмы</b> (‹cost›) <br>\nЮниты из инженерной мастерской получают больший радиус атаки по площади.",
            "28254": "Изучить <b>тигуи</b> (‹cost›) <br>\nРатуши пускают стрелы.",
            "28255": "Изучить <b>фаримбу</b> (‹cost›) <br>\nВсадники улучшаются: +5 к их атаке.",
            "28256": "Изучить <b>касбу</b> (‹cost›) <br>\nКомандные замки работают на 25% быстрее.",
            "28257": "Изучить <b>магрибских верблюдов</b> (‹cost›) <br>\nВоины на верблюдах восстанавливают здоровье.",
            "28258": "Изучить <b>поджог</b> (‹cost›) <br>\nПехотинцы наносят больше урона постройкам.",
            "28266": "Изучить <b>уараку</b> (‹cost›) <br>\nЗастрельщики и пращники могут вести огонь по противнику в упор.",
            "28267": "Изучить <b>матерчатые щиты</b> (‹cost›) <br>\nПращники, камаюки и орлы улучшаются: +1 к защите и +2 к защите от стрел.",
            "28268": "Изучить <b>православие</b> (‹cost›) <br>\nМонахи улучшаются: +3 к защите и защите от стрел.",
            "28269": "Изучить <b>дружину</b> (‹cost›) <br>\nПехота наносит урон вражеским юнитам поблизости.",
            "28270": "Изучить <b>султанов</b> (‹cost›) <br>\nСкорость сбора золота повышается на 10% (торговля, шахты, реликвии).",
            "28271": "Изучить <b>шатагни</b> (‹cost›) <br>\nРадиус атаки кулевринеров повышается на 1.",
            "28272": "Изучить <b>павезу</b> (‹cost›) <br>\nПешие стрелки и кондотьеры улучшаются: +1 к защите и +1 к защите от стрел.",
            "28273": "Изучить <b>великий шелковый путь</b> (‹cost›) <br>\nСтоимость торговых юнитов снижается на 50%.",
            "28274": "Изучить <b>лук двойной кривизны</b> (‹cost›) <br>\nВерховые стрелки улучшаются: +1 к атаке и +1 к радиусу атаки.",
            "28275": "Изучить <b>армию Корвина</b> (‹cost›) <br>\nЗа мадьярских гусар не нужно платить золотом.",
            "28276": "Изучить <b>каменоломни</b> (‹cost›) <br>\nКрестьяне добывают камень на 15% быстрее.",
            "28277": "Изучить <b>каменные рудники</b> (‹cost›) <br>\nКрестьяне добывают камень на 15% быстрее.",
            "28278": "Изучить <b>бойницы</b> (‹cost›) <br>\nАтака башен и башен-замков улучшается.",
            "28280": "Изучить <b>кочевников</b> (‹cost›) <br>\nУничтоженные дома не теряют своей прибавки к численности населения.",
            "28281": "Изучить <b>камандаран</b> (‹cost›) <br>\nЗа любых лучников нужно платить не золотом, а дополнительным количеством древесины.",
            "28282": "Изучить <b>городские патрули</b> (‹cost›) <br>\nВы можете раньше заметить приближение врагов: радиус обзора всех построек увеличивается на 4.",
            "28283": "Изучить <b>железную обшивку</b> (‹cost›) <br>\nВсе осадные орудия получают дополнительную защиту против пехоты.",
            "28284": "Изучить <b>медресе</b> (‹cost›) <br>\nУбитые монахи возвращают 33% своей стоимости.",
            "28285": "Изучить <b>сипахов</b> (‹cost›) <br>\nВерховые стрелки получают +20 очков здоровья.",
            "28286": "Изучить <b>инквизицию</b> (‹cost›) <br>\nУ монахов повышается скорость обращения.",
            "28287": "Изучить <b>рыцарство</b> (‹cost›) <br>\nСкорость производства в конюшнях вырастает на 40%.",
            "28291": "Изучить <b>клинки для бивней</b> (‹cost›) <br>\nБоевые слоны получают +3 к атаке.",
            "28292": "Изучить <b>спаренный самострел</b> (‹cost›) <br>\nСлоны с баллистой и скорпионы выпускают по два снаряда.",
            "28293": "Изучить <b>талассократию</b> (‹cost›) <br>\nВаши пристани улучшаются до более мощных гаваней, откуда пускают стрелы.",
            "28294": "Изучить <b>принудительную мобилизацию</b> (‹cost›) <br>\nЗа любых ополченцев нужно платить не золотом, а дополнительным количеством еды.",
            "28295": "Изучить <b>башни на слонах</b> (‹cost›) <br>\nБоевые слоны получают +1 к защите и +1 к защите от стрел.",
            "28296": "Изучить <b>манипурскую конницу</b> (‹cost›) <br>\nВсадники и арамбаи получают +6 к атаке против построек.",
            "28297": "Изучить <b>шатри</b> (‹cost›) <br>\nБоевые слоны получают +50 очков здоровья.",
            "28298": "Изучить <b>бумажные деньги</b> (‹cost›) <br>\nВы и ваши союзники получают по 500 ед. золота.",
            "28307": "Изучить <b>стремена</b> (‹cost›) <br>\nВсадники атакуют на 33% быстрее.",
            "28308": "Изучить <b>багаинов</b> (‹cost›) <br>\nЛюбые ополченцы получают +3 к защите.",
            "28309": "Изучить <b>церемониальные доспехи</b> (‹cost›) <br>\nЛегковооруженные всадники, копейщики-степняки и конные лучники получают +1 к обычной защите и защите от стрел.",
            "28310": "Изучить <b>осадное искусство чингизидов</b> (‹cost›) <br>\nТребюше получают +2 к радиусу атаки. Доступны совары.",
            "28311": "Изучить <b>степное коневодство</b> (‹cost›) <br>\nЛегкая кавалерия, копейщики-степняки и конные лучники обучаются на 100% быстрее.",
            "28312": "Изучить <b>ярлов</b> (‹cost›) <br>\nПехота наносит дополнительный урон всадникам.",
            "28313": "Изучить <b>греческий огонь</b> (‹cost›) <br>\nРадиус атаки огневых кораблей увеличивается на 1.",
            "28314": "Изучить <b>жаберные сети</b> (‹cost›) <br>\nРыбацкие суда собирают пищу на 25% быстрее.",
            "28315": "Изучить <b>искупление</b> (‹cost›) <br>\nМонахи могут обращать постройки (кроме ратуш, замков, монастырей, ферм, неводов, стен, ворот и чудес света) и осадные орудия. Монахи обращают большинство юнитов на расстоянии, но постройки, тараны и требушеты можно обратить, только стоя к ним вплотную.",
            "28316": "Изучить <b>примирение</b> (‹cost›) <br>\nМонахи могут обращать вражеских монахов.",
            "28318": "Изучить <b>логистику</b> (‹cost›) <br>\nКатафракты могут затаптывать противника.",
            "28319": "Изучить <b>воинскую повинность</b> (‹cost›) <br>\nВ казарме, конюшне, замке и на стрельбище юниты создаются на 33% быстрее.",
            "28320": "Изучить <b>пушечную башню</b> (‹cost›) <br>\nВы сможете строить более мощные пушечные башни с увеличенным радиусом обзора.",
            "28321": "Изучить <b>горизонтальные бойницы</b> (‹cost›) <br>\nВсе башни, замки и гавани могут вести огонь по противнику в упор.",
            "28322": "Изучить <b>саперов</b> (‹cost›) <br>\nКрестьяне наносят постройкам на 15 очков урона больше.",
            "28324": "Изучить <b>скеггокс</b> (‹cost›) <br>\nРадиус атаки метателей топоров увеличивается на 1.",
            "28325": "Изучить <b>превосходство</b> (‹cost›) <br>\nКрестьяне лучше сражаются.",
            "28326": "Изучить <b>атлатль</b> (‹cost›) <br>\nЗастрельщики улучшаются: +1 к атаке и +1 к радиусу атаки.",
            "28327": "Изучить <b>осадный требушет</b> (‹cost›) <br>\nТребушет наносит урон по площади.",
            "28342": "Изучить <b>бургундские виноградники</b> (‹cost›) <br>\nПревращает всю пищу в золото (1 ед. золота за каждые 2 ед. пищи). Вместе с пищей крестьяне приносят небольшое количество золота.",
            "28343": "Изучить <b>фламандскую революцию</b> (‹cost›) <br>\nУлучшает всех существующих поселенцев до фламандских ополченцев. Позволяет создавать фламандских ополченцев в городских советах.",
            "28344": "Изучить <b>Первый крестовый поход</b> (‹cost›) <br>\nКаждый городской совет (не более 5) единовременно создает отряд из 7 сержантов.",
            "28345": "Изучить <b>щитовые деньги</b> (‹cost›) <br>\nКаждый участник команды единовременно получает 15 ед. золота за каждый свой военный юнит.",
            "28368": "Изучить <b>Великую Китайскую стену</b> (‹cost›) <br>\nСтены и башни становятся крепче: +30% к их прочности.",
            "28369": "Изучить <b>цитадель</b> (‹cost›) <br>\nЗамки и башни стреляют на 25% быстрее.",
            "28370": "Изучить <b>мародеров</b> (‹cost›) <br>\nВы можете создавать тарканов в конюшнях.",
            "28371": "Изучить <b>ясама</b> (‹cost›) <br>\nБашни выпускают большее количество стрел.",
            "28372": "Изучить <b>килевание</b> (‹cost›) <br>\nВсе корабли получают +1 к защите от стрел. Транспортные корабли могут перевозить на 5 юнитов больше.",
            "28373": "Изучить <b>сухой док</b> (‹cost›) <br>\nКорабли передвигаются на 15% быстрее. Транспортные корабли могут перевозить на 10 юнитов больше.",
            "28374": "Изучить <b>раскаленные ядра</b> (‹cost›) <br>\nБашни наносят кораблям на 125% больше урона, а замки — на 25% больше.",
            "28376": "Изучить <b>гурдиции</b> (‹cost›) <br>\nЗамки становятся крепче: +20% к их прочности.",
            "28377": "Изучить <b>судостроение</b> (‹cost›) <br>\nНа постройку кораблей уходит на 20% меньше древесины, и они строятся на 35% быстрее.",
            "28378": "Изучить <b>осадную инженерию</b> (‹cost›) <br>\nОсадные орудия (за исключением таранов) получают +1 к радиусу атаки и наносят на 20% больше урона постройкам (подрывники — на 40% больше).",
            "28379": "Изучить <b>копьеносцев с хульче</b> (‹cost›) <br>\nУлучшает ваших застрельщиков, позволяя им метать по два снаряда.",
            "28380": "Изучить <b>ыпсон</b> (‹cost›) <br>\n+2 к радиусу атаки смотровых вышек, защитных башен и донжонов.",
            "28398": "Изучить <b>половецких наемников</b> (‹cost›) <br>\nКоманда получает бесплатно 10 элитных кипчаков в замковую эпоху.",
            "28399": "Изучить <b>крепости в холмах</b> (‹cost›) <br>\nРатуша получает +3 к радиусу атаки.",
            "28400": "Изучить <b>ростовые щиты</b> (‹cost›) <br>\nПикинеры и застрельщики получают +2 к защите от стрел.",
            "28403": "Изучить <b>припасы</b> (‹cost›) <br>\nЛюбые ополченцы стоят на 15 ед. пищи меньше.",
            "28408": "Изучить <b>шпионаж/измену</b> (Стоимость: 200 ед. золота за каждого подкупленного вражеского крестьянина для шпионажа/400 ед. золота за измену) <br>\nШпионаж (в игре на случайной карте) помогает вам увидеть вражеские постройки и юниты, попадающие в радиус обзора шпиона. Нанять одного вражеского крестьянина стоит 200 ед. золота. <br>\n<br>\nИзмена (в игре «Цареубийство») позволяет вам на несколько секунд увидеть, где находятся все вражеские короли. Они обозначаются на мини-карте мигающим знаком X. Каждый раз, когда вы выбираете измену, из ваших запасов вычитается по 400 ед. золота.",
            "28409": "Изучить <b>родословную</b> (‹cost›) <br>\nВерховые юниты получают +20 очков здоровья.",
            "28410": "Изучить <b>караван</b> (‹cost›) <br>\nТорговые обозы и торговые когги передвигаются на 50% быстрее (то есть быстрее приносят золото).",
            "28411": "Изучить <b>кольцо лучника</b> (‹cost›) <br>\nСкорость огня стрелков повышается, точность стрельбы достигает 100%.",
            "28412": "Изучить <b>ересь</b> (‹cost›) <br>\nЮниты, обращенные вражеским монахом (или миссионером), погибают, а не переходят на сторону врага.",
            "28415": "Изучить <b>парфянскую тактику</b> (‹cost›) <br>\nВерховые стрелки улучшаются: +1 к защите, +2 к защите от стрел, +4 к атаке против пикинеров. Уникальные верховые стрелки получают +2 к атаке против пикинеров.",
            "28416": "Изучить <b>теократию</b> (‹cost›) <br>\nЕсли отряд монахов обращает вражеского юнита, после обращения должен восстанавливаться только один из монахов.",
            "28419": "Изучить <b>йоменов</b> (‹cost›) <br>\nПешие стрелки получают +1 к радиусу атаки. Башни получают +2 к атаке.",
            "28420": "Изучить <b>эльдорадо</b> (‹cost›) <br>\nВоины-орлы получают +40 очков здоровья.",
            "28421": "Изучить <b>ярость кельтов</b> (‹cost›) <br>\nЮниты из инженерной мастерской получают +40% прочности.",
            "28422": "Изучить <b>сверло</b> (‹cost›) <br>\nЮниты из инженерной мастерской передвигаются на 50% быстрее.",
            "28423": "Изучить <b>погонщиков слонов</b> (‹cost›) <br>\nПерсидские боевые слоны передвигаются на 30% быстрее.",
            "28424": "Изучить <b>зелотов</b> (‹cost›) <br>\nЮниты на верблюдах получают +20 к здоровью.",
            "28425": "Изучить <b>артиллерию</b> (‹cost›) <br>\nПушечные башни, бомбарды и военные галеоны получают +2 к радиусу атаки.",
            "28426": "Изучить <b>зубчатые стены</b> (‹cost›) <br>\nЗамки получают +3 к радиусу атаки. Пехота, размещенная в постройке, может обстреливать противника.",
            "28427": "Изучить <b>анархию</b> (‹cost›) <br>\nВы можете создавать хускарлов в казарме.",
            "28428": "Изучить <b>атеизм</b> (‹cost›) <br>\nЧтобы одержать победу при захвате реликвии или строительстве чуда света, нужно продержаться на 100 лет дольше. Реликвии приносят врагам на 50% меньше ресурсов.",
            "28429": "Изучить <b>захватнические войны</b> (‹cost›) <br>\nПехота получает +4 к атаке.",
            "28431": "Изучить <b>исступление</b> (‹cost›) <br>\nБерсерки быстрее восстанавливают здоровье.",
            "28432": "Изучить <b>ракеты</b> (‹cost›) <br>\nСтрелки с чо-ко-ну получают +2 к атаке. Скорпионы получают +4 к атаке.",
            "28435": "Изучить <b>лечение травами</b> (‹cost›) <br>\nЮниты, размещенные в постройках, восстанавливают здоровье в 6 раз быстрее.",
            "28438": "Изучить <b>зажигательные снаряды</b> (‹cost›) <br>\nМангонели, онагры и осадные онагры получают +1 к радиусу атаки.",
            "28439": "Изучить <b>мобилизацию</b> (‹cost›) <br>\nЮниты в казармах создаются на 100% быстрее.",
            "42057": "Создать <b>конника</b> (‹cost›) <br>\nУникальный всадник болгар. Если лошадь убита, конник сражается как пехотинец. Эффективен против пехоты и стрелков. Не эффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства, до элитного конника — 1000 ед. пищи, 750 ед. золота (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "42058": "Создать <b>элитного конника</b> (‹cost›) <br>\nУникальный всадник болгар. Если лошадь убита, конник сражается как пехотинец. Эффективен против пехоты и стрелков. Не эффективен против мехаристов и монахов.<i> Улучшения: атака, защита (кузница); скорость, здоровье (конюшня); скорость производства (замок); больше устойчивости к обращению (монастырь).</i> <br>\n‹hp› ‹attack› ‹armor› ‹piercearmor› ‹range›",
            "120150": "Цивилизация пеших стрелков <br>\n<br>\n• Строительство городского совета в замковую эпоху требует на 50% меньше древесины <br>\n• Пешие стрелки (кроме застрельщиков) получают +1 к радиусу атаки в замковую эпоху и +1 — в имперскую (в сумме +2)<br>\n• Пастухи работают на 25% быстрее <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nанглийский лучник (стрелок) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• йомены (+1 к радиусу атаки пеших стрелков,<br>\n+2 к атаке башен); <br>\n• «боевой волк» (требюше наносят урон по площади)<br>\n<br>\n<b>Командный бонус:</b><br>\nстрельбище работает на 20% быстрее",
            "120151": "Цивилизация всадников <br>\n<br>\n• Замки на 25% дешевле <br>\n• У всадников на +20% больше очков здоровья, начиная с феодальной эпохи <br>\n• Ферма улучшается бесплатно (требуется мельница) <br>\n• Заготовители работают на 15% быстрее <br>\n<br>\n<b>Уникальный юнит:</b><br>\nметатель топоров (пехота) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• скеггокс (+1 к радиусу атаки метателей топоров); <br>\n• рыцарство (конюшни работают на 40% быстрее) <br>\n<br>\n<b>Командный бонус:</b><br>\n+2 к радиусу обзора латников",
            "120152": "Цивилизация пехоты <br>\n<br>\n• Пехота на 20% дешевле в темную эпоху, на 25% — в феодальную, на 30% — в замковую и на 35% — в имперскую<br>\n• +1 к атаке пехоты против построек с каждой новой эпохой (начиная с феодальной)<br>\n• +5 к атаке поселенцев против кабанов; охотники переносят на 15 единиц больше мяса <br>\n• +10 юнитов к населению в имперскую эпоху <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nхускарл (пехота) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• анархия (можно создавать хускарлов в казарме); <br>\n• мобилизация (казармы работают на 100% быстрее) <br>\n<br>\n<b>Командный бонус:</b><br>\nказармы работают на 20% быстрее",
            "120153": "Цивилизация пехоты <br>\n<br>\n• У монахов в 2 раза больше радиус лечения <br>\n• В башнях можно размещать в 2 раза больше юнитов <br>\n• Бесплатные горизонтальные бойницы и лечение травами <br>\n• Фермы на 40% дешевле <br>\n• В городском совете можно разместить на 10 юнитов больше <br>\n• Юниты из казармы и конюшни получают +1 к защите в замковую эпоху и +1 — в имперскую (всего +2) <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nтевтонский рыцарь (пехота) <br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• железная обшивка (дополнительная защита для осадных орудий) <br>\n• зубчатые стены (+3 к радиусу атаки замков, <br>\nпри размещении в постройке пехота обстреливает противника)<br>\n<br>\n<b>Командный бонус:</b> <br>\nюниты устойчивы к обращению",
            "120154": "Цивилизация пехоты <br>\n<br>\n• Рыбацкие суда вдвое прочнее; +2 к защите от стрел; +5% к скорости работы в темную эпоху, +10% — в феодальную эпоху, +15% — в замковую, +20% — в имперскую <br>\n• Мельницы, лесопилка и рудники на +50% дешевле <br>\n• +33% к скорости атаки пехоты начиная с феодальной эпохи <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nсамураи (пехота) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• катапаруто (требюше быстрее стреляют и сворачиваются); <br>\n• ясама (башни выпускают больше стрел) <br>\n<br>\n<b>Командный бонус:</b><br>\n+50% к радиусу обзора галер",
            "120155": "Цивилизация стрелков <br>\n<br>\n• В начале +3 крестьянина, но -50 ед. древесины и -200 ед. пищи <br>\n• -10% от стоимости технологий в феодальную эпоху, <br>\n-15% — в замковую эпоху, -20% — в имперскую <br>\n• Ратуша прибавляет 10 человек к населению и получает +5 к радиусу обзора <br>\n• Брандеры на 50% прочнее <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nстрелок с чо-ко-ну (стрелок) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• ракеты (+2 к атаке стрелка с чо-ко-ну; +4 к атаке скорпиона); <br>\n• Великая Китайская стена (+30% к прочности стен и башен) <br>\n<br>\n<b>Командный бонус:</b><br>\n+45 ед. пищи на фермах",
            "120156": "Оборонительная цивилизация <br>\n<br>\n• +10% к прочности построек в темную эпоху, +20% — в феодальную эпоху, +30% — в замковую и +40% — в имперскую <br>\n• Мехаристы, застрельщики, пикинеры и алебардисты на 25% дешевле <br>\n• Скорость атаки огневых кораблей выше на 25% <br>\n• Переход в имперскую эпоху на 33% дешевле <br>\n• Бесплатная городская стража <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nкатафракт (всадник) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• греческий огонь (+1 к радиусу атаки огневых кораблей) <br>\n• искусство маневра (катафракты могут затаптывать противника)<br>\n<br>\n<b>Командный бонус:</b> <br>\nмонахи лечат на +50% быстрее",
            "120157": "Цивилизация всадников <br>\n<br>\n• В начале +50 ед. древесины и пищи <br>\n• Городской совет и пристань в 2 раза прочнее; +10% к их скорости работы в феодальную эпоху, +15% — в замковую эпоху, +20% — в имперскую <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nперсидский боевой слон (всадник) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• погонщики слонов (+30% к скорости персидских боевых слонов); <br>\n• камандаран (за любых лучников нужно платить не золотом, а дополнительным количеством древесины)<br>\n<br>\n<b>Командный бонус:</b> <br>\n+2 к атаке латников против стрелков",
            "120158": "Цивилизация верблюдов и флота <br>\n<br>\n• Стоимость торговли на рынке всего 5% <br>\n• Рынок на 100 ед. древесины дешевле <br>\n• У транспортных кораблей в 2 раза больше прочность <br>\nи в 2 раза выше грузоподъемность <br>\n• Скорость атаки галер выше на 25% <br>\n• +10 к здоровью юнитов на верблюдах<br>\n<br>\n<b>Уникальный юнит:</b> <br>\nмамлюк (мехарист) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• зелоты (+20 к здоровью юнитов на верблюдах); <br>\n• медресе (при убийстве монаха возвращается 33% его стоимости) <br>\n<br>\n<b>Командный бонус:</b><br>\n+2 к атаке пеших стрелков против построек",
            "120159": "Цивилизация пороха <br>\n<br>\n• У юнитов с огнестрельным оружием на 25% больше запас здоровья; изучение технологий, связанных с порохом, на 50% дешевле; бесплатная химия <br>\n• Золотодобытчики работают на 20% быстрее <br>\n • +1 к защите от стрел для конных разведчиков, легковооруженных всадников и гусаров <br>\n • Бесплатные улучшения гусаров и легковооруженных всадников<br>\n<br>\n<b>Уникальный юнит:</b><br>\nянычар (кулевринер) <br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• артиллерия (+2 к дальности стрельбы артиллерийских башен, бомбард и военных галеонов); <br>\n• сипахи (+20 к запасу здоровья конных лучников) <br>\n<br>\n<b>Командный бонус:</b><br>\nюниты с огнестрельным оружием создаются на 25% быстрее",
            "120160": "Цивилизация пехоты и флота <br>\n<br>\n• Военные корабли на 15% дешевле в феодальную эпоху, на 15% — в замковую эпоху и на 20% — в имперскую <br>\n• У пехоты +10% очков здоровья в феодальную эпоху, +15% — в замковую эпоху, +20% — в имперскую <br>\n• Бесплатные ручная тележка и ручная повозка <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nберсерк (пехота), драккар (военный корабль) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• исступление (берсерки быстрее восстанавливают здоровье); <br>\n• ярлы (пехота наносит дополнительный урон всадникам) <br>\n<br>\n<b>Командный бонус:</b><br>\nпристань на 15% дешевле",
            "120161": "Цивилизация верховых стрелков <br>\n<br>\n• Скорость стрельбы верховых стрелков на 25% выше <br>\n• У копейщиков-степняков, гусар и легкой кавалерии на 30% больше очков здоровья <br>\n• Охотники работают на 40% быстрее <br>\n<br>\n<b>Уникальный юнит:</b>  <br>\nмангут (верховой стрелок) <br>\n<br>\n<b>Уникальные технологии:</b>  <br>\n• кочевники (уничтоженные дома не теряют своей прибавки к численности населения); <br>\n• сверло (+50% к скорости юнитов из инженерной мастерской)<br>\n<br>\n<b>Командный бонус:</b>  <br>\n+2 к радиусу обзора конных разведчиков, легкой кавалерии и гусар",
            "120162": "Цивилизация пехоты и осады <br>\n<br>\n• Скорость пехоты на 15% выше (начиная с феодальной эпохи) <br>\n• Лесорубы работают на 15% быстрее <br>\n• Осадные орудия стреляют на 25% быстрее <br>\n• Можно украсть овцу; в пределах радиуса обзора кельтского юнита овцу украсть нельзя<br>\n<br>\n<b>Уникальный юнит:</b><br>\nраскрашенный разбойник (пехота) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• твердыня (+25% к скорости стрельбы замков и башен); <br>\n• ярость кельтов (+40% к прочности юнитов из инженерной мастерской) <br>\n<br>\n<b>Командный бонус:</b> <br>\nинженерные мастерские работают на 20% быстрее",
            "120163": "Цивилизация монахов и пороха <br>\n<br>\n• Строители работают на 30% быстрее <br>\n• Улучшение кузницы не требует золота <br>\n• Баллистика дает преимущество военным галеонам: они стреляют быстрее и точнее <br>\n• Юниты с огнестрельным оружием атакуют на 18% быстрее<br>\n<br>\n<b>Уникальные юниты:</b><br>\nконкистадор (верховой кулевринер), миссионер (верховой монах) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• превосходство (крестьяне сильнее в бою); <br>\n• инквизиция (монахи проводят обращение быстрее) <br>\n<br>\n<b>Командный бонус:</b> <br>\nторговые юниты производят на 25% больше золота",
            "120164": "Цивилизация пехоты и монахов <br>\n<br>\n• Поселенцы переносят на 3 ед. ресурсов больше <br>\n• Военные юниты создаются на 11% быстрее <br>\n• Каждая монастырская технология добавляет монахам +5 ед. здоровья <br>\n• В начале +50 ед. золота<br>\n<br>\n<b>Уникальный юнит:</b> <br>\nвоин-ягуар (пехота) <br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• атлатль (+1 к атаке и радиусу атаки застрельщиков) <br>\n• захватнические войны (+4 к атаке пехоты); <br>\n<br>\n<b>Командный бонус:</b> <br>\nреликвии приносят на 33% больше золота",
            "120165": "Цивилизация стрелков <br>\n<br>\n• В начале +1 крестьянин, но -50 ед. пищи <br>\n• Ресурсов хватает на 15% дольше <br>\n• -10% от стоимости стрелков в феодальную эпоху, -20% — в замковую эпоху, -30% — в имперскую <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nлучник-холькан (стрелок) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• эльдорадо (+40 к здоровью воинов-орлов), <br>\n• копьеносцы с хульче (застрельщики метают по 2 снаряда) <br>\n<br>\n<b>Командный бонус:</b><br>\nстены на 50% дешевле",
            "120166": "Цивилизация всадников <br>\n<br>\n• Дома не требуются, но в начале -100 ед. древесины <br>\n• -10% от стоимости конных лучников в замковую эпоху, -20% — в имперскую эпоху <br>\n• +30% к точности требушетов <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nтаркан (всадник) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• атеизм (+100 лет до победы при захвате реликвий или строительстве чуда света; реликвии приносят врагам на 50% меньше ресурсов); <br>\n• мародеры (тарканов можно создавать в конюшне) <br>\n<br>\n<b>Командный бонус:</b><br>\nконюшни работают на 20% быстрее",
            "120167": "Оборонительная цивилизация флота <br>\n<br>\n• +3 к радиусу обзора поселенцев <br>\n• Горняки работают на 20% быстрее <br>\n• Бесплатное улучшение башен (для артиллерийской башни требуется химия) <br>\n• Бесплатное улучшение защиты лучников<br>\n• Военные юниты (кроме осадных орудий) требуют на 20% меньше древесины <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nбоевая телега (конный лучник), корабль-черепаха (военный корабль)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• ыпсон (+2 к радиусу атаки смотровых вышек, защитных башен и донжонов); <br>\n• зажигательные снаряды (+1 к радиусу атаки любых мангонелей)<br>\n<br>\n<b>Командный бонус:</b> <br>\nминимальный радиус атаки любых мангонелей снижен",
            "120168": "Цивилизация стрелков и флота <br>\n<br>\n• Переход в новую эпоху на 15% дешевле <br>\n• Технологии пристани и университета на 33% дешевле <br>\n• Рыбацкие суда на 15% дешевле <br>\n• Юниты с огнестрельным оружием на 20% дешевле <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nгенуэзский арбалетчик (стрелок), кондотьер (пехота)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• павеза (у пеших стрелков и кондотьеров +1 к защите и +1 к защите от стрел); <br>\n• великий шелковый путь (торговые юниты на 50% дешевле)<br>\n<br>\n<b>Командный бонус:</b> <br>\nв имперскую эпоху кондотьеров можно создавать в казарме",
            "120169": "Цивилизация верблюдов и пороха <br>\n<br>\n• Поселенцы стоят на 10% меньше в темную эпоху, на 15% — в феодальную, на 20% — в замковую, на 25% — в имперскую <br>\n• Рыболовы работают на 10% быстрее <br>\n• Юниты из конюшен получают +1 к защите от стрел в замковую эпоху и +1 — в имперскую (всего +2)<br>\n<br>\n<b>Уникальные юниты:</b> <br>\nлучник на слоне (верховой стрелок), мехарист-гвардеец (мехарист)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• шатагни (+1 к радиусу атаки кулевринеров); <br>\n• султаны (золото собирается на 10% быстрее) <br>\n<br>\n<b>Командный бонус:</b><br>\nюниты на верблюдах получают +4 к атаке против построек",
            "120170": "Цивилизация пехоты <br>\n<br>\n• В начале бесплатно доступна лама <br>\n• Улучшения кузницы влияют на поселенцев <br>\n• Дома прибавляют 10 юнитов к населению <br>\n• Постройки требуют на 15% меньше камня <br>\n<br>\n<b>Уникальные юниты:</b><br>\nкамаюк (пехота), пращник (стрелок) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• уарака (застрельщики и пращники могут вести огонь в упор); <br>\n• матерчатые щиты (пращники, камаюки и орлы получают +1 к защите и +2 к защите от стрел)<br>\n<br>\n<b>Командный бонус:</b> <br>\nпашни строятся на 100% быстрее",
            "120171": "Цивилизация всадников <br>\n<br>\n• Крестьяне убивают волков одним ударом <br>\n• Ковка, чугунное литье и доменная печь бесплатны <br>\n• Конный разведчик, легкий кавалерист и гусар на 15% дешевле <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nмадьярский гусар (всадник) <br>\n<br>\n<b>Уникальные технологии:</b><br>\n• армия Корвина (за мадьярских гусар не нужно платить золотом); <br>\n• лук двойной кривизны (+1 к атаке и радиусу атаки верховых стрелков)<br>\n<br>\n<b>Командный бонус:</b><br>\n+2 к радиусу обзора пеших стрелков",
            "120172": "Цивилизация пехоты и осады <br>\n<br>\n• Фермеры работают на 10% быстрее <br>\n• Припасы бесплатны <br>\n• Юниты из инженерной мастерской на 15% дешевле<br>\n<br>\n<b>Уникальный юнит:</b> <br>\nбоярин (всадник)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• православие (монахи получают +3 к обычной защите и +3 к защите от стрел); <br>\n• дружина (пехота наносит урон вражеским юнитам поблизости) <br>\n<br>\n<b>Командный бонус:</b><br>\nвоенные постройки увеличивают численность населения на +5 человек",
            "120173": "Цивилизация пороха и флота <br>\n<br>\n• Все юниты требуют на 20% меньше золота <br>\n• Технологии исследуются на 30% быстрее <br>\n• Корабли на 10% прочнее <br>\n• Факторию можно построить в имперскую эпоху <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nорган (осадное орудие), каравелла (военный корабль)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• каракка (корабли получают +1 к обычной защите и +1 к защите от стрел); <br>\n• аркебуза (юниты с огнестрельным оружием стреляют точнее)<br>\n<br>\n<b>Командный бонус:</b><br>\nобщий радиус обзора у всех игроков команды, начиная с темной эпохи",
            "120174": "Цивилизация стрелков <br>\n<br>\n• Скорость огня стрелков на 18% выше <br>\n• +100 ед. золота, +100 ед. пищи при переходе в следующую эпоху <br>\n• Улучшения пикинеров бесплатны<br>\n<br>\n<b>Уникальный юнит:</b><br>\nамхарский воин (пехота)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• королевские наследники (амхарские воины обучаются почти мгновенно); <br>\n• торсионные механизмы (юниты из инженерной мастерской получают больший радиус атаки по площади)<br>\n<br>\n<b>Командный бонус:</b> <br>\n+3 к радиусу обзора башен и застав",
            "120175": "Цивилизация пехоты <br>\n<br>\n• Постройки требуют на 15% меньше древесины <br>\n• Юниты из казармы получают +1 к защите от стрел с каждым переходом в новую эпоху (начиная с феодальной эпохи)<br>\n• Золотодобыча бесплатна <br>\n<br>\n<b>Уникальный юнит:</b><br>\nгбето (пехота)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• тигуи (ратуши пускают стрелы, если в ней не размещены юниты); <br>\n• фаримба (+5 к атаке всадников)<br>\n<br>\n<b>Командный бонус:</b> <br>\nуниверситет работает на 80% быстрее",
            "120176": "Цивилизация всадников и флота <br>\n<br>\n• Поселенцы передвигаются на 10% быстрее <br>\n• Юниты из конюшни на 15% дешевле в замковую эпоху, на 20% — в имперскую эпоху<br>\n• Корабли передвигаются на 10% быстрее <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nлучник на верблюде (верховой стрелок), генитур (верховой застрельщик)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• касба (командные замки работают на 25% быстрее); <br>\n• магрибские верблюды (юниты на верблюдах восстанавливают здоровье)<br>\n<br>\n<b>Командный бонус:</b><br>\nгенитур доступен на стрельбище, начиная с замковой эпохи",
            "120177": "Цивилизация осады и слонов <br>\n<br>\n• Не требуются постройки для перехода в следующую эпоху или разблокирования других построек<br>\n• Боевые слоны двигаются на 10% быстрее<br>\n• Крестьяне могут размещаться в домах <br>\n<br>\n<b>Уникальный юнит:</b><br>\nслон с баллистой (скорпион на спине слона)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• клинки для бивней (+3 к атаке боевых слонов); <br>\n• спаренный самострел (слоны с баллистой и скорпионы выпускают по два снаряда) <br>\n<br>\n<b>Командный бонус:</b> <br>\n+1 к радиусу атаки скорпионов",
            "120178": "Цивилизация флота <br>\n<br>\n• Переход в новые эпохи быстрее на 66% <br>\n• Невод на 33% дешевле<br>\n• Невод дает неограниченное количество пищи <br>\n• Боевые слоны на 30% дешевле <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nпендекар (пехота)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• талассократия (пристани улучшаются до гаваней и выпускают стрелы); <br>\n• принудительная мобилизация (за любых ополченцев нужно платить не золотом, а дополнительным количеством еды)<br>\n<br>\n<b>Командный бонус:</b> <br>\n+100% к радиусу обзора пристаней",
            "120179": "Цивилизация монахов и слонов <br>\n<br>\n• Улучшения для лесопилки бесплатны <br>\n• +1 к атаке пехоты с каждой новой эпохой (начиная с феодальной эпохи)<br>\n• Технологии в монастыре на 50% дешевле <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nарамбай (стрелковый всадник)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• стрелки на слонах (боевые слоны получают +1 к обычной защите и +1 к защите от стрел); <br>\n• манипурская конница (+6 к атаке против построек у всадников и арамбаев)<br>\n<br>\n<b>Командный бонус:</b><br>\nреликвии видны на карте в начале игры",
            "120180": "Цивилизация стрелков <br>\n<br>\n• В начале игры видны позиции врагов <br>\n• На экономические улучшения не расходуется древесина <br>\n• У юнитов из стрельбища +20% к здоровью <br>\n• Воинская повинность доступна бесплатно <br>\n<br>\n<b>Уникальные юниты:</b><br>\nлучник с плетеным щитом (стрелок), имперский застрельщик (застрельщик)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• шатри (+50 к здоровью боевых слонов); <br>\n• бумажные деньги (каждый участник команды получает 500 ед. золота)<br>\n<br>\n<b>Командный бонус:</b> <br>\nулучшение до застрельщика-гвардейца доступно в имперскую эпоху",
            "120181": "Цивилизация пехоты и всадников <br>\n<br>\n• Улучшения любых ополченцев бесплатны <br>\n• В замковую эпоху строительство городского совета требует на 50% меньше камня<br>\n• Изучение технологий в кузнице и инженерной мастерской стоит на 50% меньше пищи<br>\n• Можно строить крепости <br>\n<br>\n<b>Уникальный юнит:</b><br>\nконник (всадник)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• стремена (всадники атакуют на 33% быстрее) <br>\n• багаины (+5 к защите любых ополченцев) <br>\n<br>\n<b>Командный бонус:</b> <br>\nкузницы работают на 80% быстрее",
            "120182": "Цивилизация конных лучников <br>\n<br>\n• Поселенцы приносят на +50% больше пищи при забое скота <br>\n• Юниты наносят на +25% больше урона, если находятся выше противника <br>\n• Новые городские советы начиная с замковой эпохи производят по две овцы <br>\n• Кольцо лучника и парфянская тактика бесплатны <br>\n<br>\n<b>Уникальный юнит:</b><br>\nкэшик (всадники-налетчики), совар (подрывник)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• церемониальные доспехи (+1 к обычной защите и защите от стрел у легковооруженных всадников, копейщиков-степняков и конных лучников); <br>\n• осадное искусство чингизидов (радиус атаки требюше увеличивается на 2, доступны совары)<br>\n<br>\n<b>Командный бонус:</b><br>\nрадиус обзора конных лучников увеличивается на +2",
            "120183": "Цивилизация всадников <br>\n<br>\n• В феодальную эпоху можно строить дополнительные городские советы <br>\n• Инженерная мастерская и деревянный таран доступны в феодальную эпоху; улучшение до медного тарана доступно в замковую эпоху<br>\n• Всадники на 5% быстрее начиная с феодальной эпохи <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nКипчак (верховой стрелок)<br>\n<br>\n<b>Уникальные технологии:</b><br>\n• Степное коневодство (легковооруженные всадники, копейщики-степняки и конные лучники создаются на 100% быстрее); <br>\n• Половецкие наемники (участники команды могут бесплатно создать 10 элитных кипчаков в замке)<br>\n<br>\n<b>Командный бонус:</b> <br>\nпрочность частокола выше на +50%",
            "120184": "Цивилизация всадников и монахов <br>\n<br>\n• В начале +150 ед. пищи <br>\n• Застрельщики и любые копейщики двигаются на 10% быстрее<br>\n• За каждую размещенную реликвию +1 к атаке латников и лейти (максимум +4) <br>\n<br>\n<b>Уникальный юнит:</b><br>\nлейти (всадник)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• крепости в холмах (+3 к радиусу атаки городского совета) <br>\n• ростовые щиты (+2 к защите от стрел у застрельщиков и любых копейщиков)<br>\n<br>\n<b>Командный бонус:</b> <br>\nмонастыри работают на 20% быстрее",
            "120185": "Цивилизация всадников <br>\n<br>\n• Экономические улучшения доступны на одну эпоху раньше <br>\n• Технологии конюшни на 50% дешевле <br>\n• Улучшение до рыцаря доступно в замковую эпоху<br>\n• Юниты с огнестрельным оружием получают +25% к атаке <br>\n<br>\n<b>Уникальные юниты:</b> <br>\nкутилье (всадник), фламандский ополченец (пехота)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• бургундские виноградники (превращает всю пищу в золото; крестьяне приносят небольшое количество золота вместе с пищей) <br>\n• фламандская революция (улучшает всех существующих поселенцев до фламандских ополченцев; позволяет создавать фламандских ополченцев в городских советах)<br>\n<br>\n<b>Командный бонус:</b> <br>\nреликвии приносят и золото, и пищу",
            "120186": "Цивилизация пехоты <br>\n<br>\n• Замки и городские советы возводятся на 100% быстрее <br>\n• Наземные военные юниты получают на 50% меньше дополнительного урона <br>\n• Каждое улучшение ферм дает +100% дополнительной пищи<br>\n• Может строить башню-замок <br>\n<br>\n<b>Уникальный юнит:</b> <br>\nсержант (пехота)<br>\n<br>\n<b>Уникальные технологии:</b> <br>\n• Первый крестовый поход (каждый городской совет, но не более 5, единовременно создает отряд из 7 сержантов) <br>\n• щитовые деньги (каждый участник команды единовременно получает 15 ед. золота за каждый свой военный юнит)<br>\n<br>\n<b>Командный бонус:</b> <br>\nТранспортные корабли получают +5 к грузоподъемности и +10 к защите от противокорабельных атак",
            "300081": "Легенда",
            "300082": "Уникальный юнит",
            "300083": "Юнит",
            "300084": "Постройка",
            "300085": "Технология"
        };
        // loadLocale(storedLocale);
    // });

    document.getElementById('civselect').addEventListener('change', loadCiv)

    // let doVerticalScroll = true;
    // const techtreeElement = document.getElementById('techtree');
    // techtreeElement.addEventListener('wheel', function (e) {
    //     if (e.deltaX !== 0) {
    //         doVerticalScroll = false;
    //     }
    //     if (doVerticalScroll && techtreeDoesNotHaveScrollbar() && shiftKeyIsNotPressed(e)) {
    //         if (e.deltaY > 0) {
    //             techtreeElement.scrollLeft += 150;
    //         } else if (e.deltaY < 0) {
    //             techtreeElement.scrollLeft -= 150;
    //         }
    //     }
    // });
}

main();