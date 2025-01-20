var dbug = !true;
let version = "1.1.1";
let lastUpdated = "2025-01-20";
let showPrecise = false;
let calcRounded = true;
var fcs = {
	"paymentAmnt" : null,
	"inflationRate" : null,
	"startDate" : null,
	"endDate" : null,
	"calcBtn" : null,
	"resultsOutput" : null,
	"fortnight" : null,
	"day" : null,
	"businessday" : null,
	"week" : null,
	"month" : null,
	"year" : null,
	"etfPrice" : null,
	"growthRate" : null,
	"resultsHolder" : null,
	"version" : null,
	"lastUpdated" : null
}
let worksheet = {};	// I'm a COBOL programmer by day.  :p
const today = new Date(); //.toISOString().substring(0,10);
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
function init () {
	if (dbug) console.log ("initting...");
	try {
		for (var control in fcs) {
			//if (dbug) console.log ("Getting control " + control + ".");
			fcs[control] = document.getElementById(control);
			//if (dbug) console.log ((fcs[control] ? "Got control " + control + "." : "Didn't get control " + control + "."));
			if (control == "startDate") {
				if (dbug) console.log ("Tomorrow is " + tomorrow + ".");
				fcs[control].value = tomorrow.toISOString().substring(0,10);
				//fcs[control].addEventListener("change", calculate, false);
			} else if (control == "endDate") {
				const lastday = new Date(tomorrow.getFullYear()+35, tomorrow.getMonth(), tomorrow.getDate());
				
				if (dbug) console.log ("Today is " + today + ".");
				fcs[control].value = lastday.toISOString().substring(0,10);;
			} else if (control == "calcBtn") {
				fcs[control].addEventListener("click", gatherData, false);
			} else if (false && dbug && (control == "month" || control == "fortnight")) {
				console.log (control + ": " + fcs[control].checked +".");
			} else if (control == "version") {
				fcs[control].textContent = version;
			} else if (control == "lastUpdated") {
				fcs[control].textContent = lastUpdated;
			}
		}
	}
	catch (ex) {
		console.error ("Caught exception: " + ex.message);
	}
	if (dbug) console.log ("inited.");
	handleHash ();

} // End of init

function gatherData () {
	removeChildren(fcs["resultsHolder"]);
	worksheet  = {};

	worksheet["cost"] = fcs["paymentAmnt"].value;
	worksheet["paymentPeriod"] = getPayPeriod(); //(fcs["month"].checked ? 12 : 26);
	let paymentPeriod = worksheet["paymentPeriod"];
	worksheet["inflationRate"] = fcs["inflationRate"].value;
	worksheet["startDate"] = fcs["startDate"].value;
	worksheet["endDate"] = fcs["endDate"].value;
	worksheet["etfPrice"] = fcs["etfPrice"].value;
	worksheet["growthRate"] = fcs["growthRate"].value; //getDailyGrowthRate(); 


	if (dbug) console.log ("Calculating....");
	if (dbug) console.log ("Got payrate: " + paymentPeriod + ".");


	setURL();
	calculate();
} // End of gatherData

function calculate () {
	const resultsH2 = createHTMLElement("h2", {"parentNode" : fcs["resultsHolder"], "tabindex" : "-1", "textNode" : "Results", "id" : "resultsH2"});

	// Gather Data
	let cost = fcs["paymentAmnt"].value;
	const inflationRate = fcs["inflationRate"].value/100;
	const startDate = fcs["startDate"].value;
	const endDate = fcs["endDate"].value;
	let etfPrice = fcs["etfPrice"].value;
	let growthRate = getDailyGrowthRate(); 


	if (dbug) console.log ("Calculating....");
	let paymentPeriod = worksheet["paymentPeriod"]; //(fcs["month"].checked ? 12 : 26);
	if (dbug) console.log ("Got payrate: " + paymentPeriod + ".");

	let account = 0;
	let totalSaved = 0;
	let shares = 0;
	let portfolio = 0;
	let totalWorth = 0;

	let dparts = startDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
	let current = new Date(dparts[1], dparts[2]-1, dparts[3]);
	let nextBuyDay = new Date(dparts[1], dparts[2]-1, dparts[3]);
	let nextInflationDay = new Date(parseInt(dparts[1]) + parseInt(1), dparts[2]-1, dparts[3]);

	let parts = endDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
	let future = new Date(parts[1], parts[2]-1, parts[3]);
	let acb = {"acb" : 0, "shares" : []};
	if (dbug) console.log ("Starting with current: " + current.toISOString().substring(0,10) + ", and nextBuyDay is: " + nextBuyDay.toISOString().substring(0,10) + ", and will keep going until " + future.toISOString().substring(0,10) + ".");
	let years = {};
	let totalETFCost = 0;

	const tableHolder =createHTMLElement("div", {"parentNode" : fcs["resultsHolder"], "class": "tables-responsive"});

	let resTable = createHTMLElement("table", {"parentNode" : tableHolder, "caption" : "Summary of results"});
	let resTHead = createHTMLElement("thead", {"parentNode" : resTable});
	let resTheadTR = createHTMLElement("tr", {"parentNode" : resTHead});

	let yearTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "Year"});
	let costTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textContent" : "Cost of Latté ($)"});
	let totalSavedTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textContent" : "Total Saved ($)"});
	let etfPriceTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "ETF Price per Share ($)"});
	let accountTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "Cash"});
	let sharesTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "Shares"});
	let portfolioTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "Portfolio Value ($)"});
	let totalTH = createHTMLElement("th", {"parentNode" : resTheadTR, "scope" : "col", "textNode" : "Total ($)"});

	let resTBody = createHTMLElement("tbody", {"parentNode" : resTable});
	let resTBodyTR = createHTMLElement("tr", {"parentNode" : resTBody});
	let yearTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : current.getFullYear()});
	let costTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(cost)});
	let totalSavedTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(totalSaved)});
	let etfPriceTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(etfPrice)});
	let accountTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(account)});
	let sharesTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : shares});
	let portfolioTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(portfolio)});
	let totalTD = createHTMLElement("td", {"parentNode" : resTBodyTR, "textNode" : getNum(totalWorth)});


	while (current < future) {
		let tr = null;
		if (current.toISOString().substring(0,10) == nextInflationDay.toISOString().substring(0,10)) {
			if (dbug) console.log ("Since current is " + current.toISOString().substring(0,10) + ", and nextInflationDay is " + nextInflationDay.toISOString().substring(0,10) +", I'm inflating the price.");
			cost = cost * (parseInt(1) + parseFloat(inflationRate));
			nextInflationDay.setFullYear(parseInt(current.getFullYear()) + parseInt(1));
			if (dbug) console.log ("Setting next inflation date to " + nextInflationDay.toISOString().substring(0,10) + ".");
			tr = createHTMLElement("tr", {"parentNode" : resTBody});
			let yearTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : current.getFullYear()});
			let costTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(cost)});
			let totalSavedTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(totalSaved)});
			let etfPriceTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(etfPrice)});
			let accountTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(account)});
			let sharesTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : shares});
			portfolio = shares * etfPrice;
			totalWorth = parseFloat(account) + parseFloat(portfolio);
			let portfolioTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(portfolio)});
			let totalTD = createHTMLElement("td", {"parentNode" : tr, "textNode" : getNum(totalWorth)});
		}
		//if (dbug) console.log ("Now calculating for day " + current.toString() + ".");
		if (dbug) console.log ("Comparing " + current.toISOString().substring(0,10) + " to " + nextBuyDay.toISOString().substring(0,10)  + ".");
		if (current.toISOString().substring(0,10) == nextBuyDay.toISOString().substring(0,10)) {
			if (dbug) console.log ("It's " + nextBuyDay.toISOString().substring(0,10) + ", so I'm going to save the $ " + cost + ".");
			totalSaved += parseFloat(cost);
			account += parseFloat(cost);
			if (account >= etfPrice) {
				let numShares = Math.floor(account / etfPrice);
				totalETFCost += (etfPrice * numShares);
				account = account - (etfPrice * numShares);
				shares = shares + numShares;
				acb["shares"].push ({"numShares" : numShares, "cost" : etfPrice});
				portfolio = shares * etfPrice;
				totalWorth = parseFloat(account) + parseFloat(portfolio);
			}
			if (paymentPeriod == "day") {
				nextBuyDay.setDate(nextBuyDay.getDate() + parseInt(1));
			} else if (paymentPeriod == "businessday") {
				const daysToAdd = (nextBuyDay.getDay() == 5 ? 3 : 1);
			//	console.log ("Going to add " + daysToAdd + " to " + nextBuyDay.toISOString().substring(0,10) + ".");
				nextBuyDay.setDate(nextBuyDay.getDate() + parseInt(daysToAdd));
			} else if (paymentPeriod == "week") {
				nextBuyDay.setDate(nextBuyDay.getDate() + parseInt(7));
			} else if (paymentPeriod == "fortnight") {
				nextBuyDay.setDate(nextBuyDay.getDate() + parseInt(14));
			} else if (paymentPeriod == "month") {
				// Ahhh sheeeeeeeet
				nextBuyDay = nextBuyDay.addMonths(1);
				if (dbug) console.log ("Set nextBuyDay to " + nextBuyDay.toISOString().substring(0,10) + ".");
			} else if (paymentPeriod == "year") {
				nextBuyDay.setFullYear(nextBuyDay.getFullYear() + parseInt(1));
			}

		}
		
		if (current.getDay() > 0 && current.getDay() < 6) {	// don't calculate weekends
			// increaese the etf price
			etfPrice = etfPrice * growthRate;
			//if (dbug) console.log ("Now day is " + current.toString() + ".");
		}

		

		current.setDate(current.getDate() + parseInt(1));
	}
	portfolio = shares * etfPrice;
	totalWorth = parseFloat(account) + parseFloat(portfolio);
	let resTFoot = createHTMLElement("tfoot", {"parentNode" : resTable});
	let resTFootTR = createHTMLElement("tr", {"parentNode" : resTFoot});
	yearTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : future.getFullYear()});
	costTD = createHTMLElement("td", {"parentNode" : resTFootTR, "scope" : "col", "textNode" : getNum(cost)});
	totalSavedTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : getNum(totalSaved)});
	etfPriceTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : getNum(etfPrice)});
	accountTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : getNum(account)});
	sharesTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : shares});
	portfolioTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : getNum(portfolio)});
	totalTD = createHTMLElement("td", {"parentNode" : resTFootTR, "textNode" : getNum(totalWorth)});



	if (dbug) {
		console.log ("Ending with with current: " + current.toISOString().substring(0,10) + ", and nextBuyDay is: " + nextBuyDay.toISOString().substring(0,10) + ", and will keep going until " + future.toISOString().substring(0,10) + ".");
		console.log ("ETF Price is now: " + etfPrice + ", and the cost is now $" + cost + ".");
		console.log ("And you have " + shares + " shares, which is now worth $" + (shares * etfPrice) + ".");
		console.log ("And your account is worth $"  + account + ".");
		console.log ("For a total amount of $" + (parseFloat(account) + (shares * etfPrice)) + ".");
	}
	acb["acb"] = (shares == 0 ? null : totalETFCost / shares);

	worksheet["acb"] = acb;
	worksheet["etfPrice"] = etfPrice;
	worksheet["cost"] = cost;
	worksheet["shares"] = shares;
	worksheet["account"] = account;

	const otherInfoH3 = createHTMLElement("h3", {"parentNode" : fcs["resultsHolder"], "textNode" : "Other Info"});
	const otherDL = createHTMLElement("dl", {"parentNode" : fcs["resultsHolder"]});
	const totalCostDT = createHTMLElement("dt", {"parentNode" : otherDL, "textNode" : "Total Cost of lattés"});
	const totalCostDD = createHTMLElement("dd", {"parentNode" : otherDL, "textNode" : getNum(totalSaved)});
	const oppCostDT = createHTMLElement("dt", {"parentNode" : otherDL, "textNode" : "Opportunity Cost of lattés"});
	const oppCostDD = createHTMLElement("dd", {"parentNode" : otherDL, "textNode" : getNum(totalWorth)});
	if (shares > 0) {
		const acbDT = createHTMLElement("dt", {"parentNode" : otherDL, "textNode" : "ACB (Average Cost Basis) of ETFs"});
		const acbDD = createHTMLElement("dd", {"parentNode" : otherDL, "textNode" : getNum(acb["acb"])});
		const capitalGainDT = createHTMLElement("dt", {"parentNode" : otherDL, "textNode" : "Capital Gain"});
		const capitalGainDD = createHTMLElement("dd", {"parentNode" : otherDL, "textNode" : getNum((etfPrice * shares) - (acb["acb"] * shares))});
		const taxableDT = createHTMLElement("dt", {"parentNode" : otherDL, "textNode" : "Taxable Capital Gain"});
		const taxableDD = createHTMLElement("dd", {"parentNode" : otherDL, "textNode" : getNum(((etfPrice * shares) - (acb["acb"] * shares))/2)});
	}
	
	const retirementIncomeH3 = createHTMLElement("h3", {"parentNode": fcs["resultsHolder"], "textNode" : "Annual Increae To Retirement Income"});
	const retirementIncomeP1 = createHTMLElement("p", {"parentNode" : fcs["resultsHolder"], "textNode" : "In FIRE (Financially Independent Retire Early) circles, the 4% rule says that you can withdraw 4% of your income annually for 30 years before you risk running out of money. This works in most cases, but not all.  Some use the 3.5% rule for even more cases.  3% is pretty much all cases, and will be good for longer than 30 years."});
	const retirementIncomeP2 = createHTMLElement("p", {"parentNode" : fcs["resultsHolder"], "textNode" : "The following shows how the above results could add to your annual retirement income.  It's up to you to decide if it's worth the latté."});
	const retirementIncomeDL = createHTMLElement("dl", {"parentNode" : fcs["resultsHolder"]});
	const fourRuleDT = createHTMLElement("dt", {"parentNode" : retirementIncomeDL, "textNode" : "The 4% Rule"});
	const fourRuleDD = createHTMLElement("dd", {"parentNode" : retirementIncomeDL, "textNode" : getNum(totalWorth * 0.04)});
	const threeFiveRuleDT = createHTMLElement("dt", {"parentNode" : retirementIncomeDL, "textNode" : "The 3.5% Rule"});
	const threeFiveRuleDD = createHTMLElement("dd", {"parentNode" : retirementIncomeDL, "textNode" : getNum(totalWorth * 0.035)});
	const threeRuleDT = createHTMLElement("dt", {"parentNode" : retirementIncomeDL, "textNode" : "The 3.5% Rule"});
	const threeRuleDD = createHTMLElement("dd", {"parentNode" : retirementIncomeDL, "textNode" : getNum(totalWorth * 0.03)});


	resultsH2.focus();

} // End of calculate

// Check the document location for saved things
function handleHash () {
	let hasHash = false;
	let thisURL = new URL(document.location);
	let params = thisURL.searchParams;

	//let hash = thisURL.hash;
	let toCalculate = 0;
	if (params.has("dbug")) {
		if (params.get("dbug") == "true") dbug= true;
	}

	if (params.has("cost")) {
		let cost = params.get("cost").replace(/[^\d\.]/g, "");
		fcs["paymentAmnt"].value = cost;
		worksheet["cost"] = cost;
		toCalculate = toCalculate + 1;
		hasHash = true;
	}
	if (params.has("paymentPeriod")) {
		let pp = params.get("paymentPeriod");
		if (fcs.hasOwnProperty(pp)) {
			fcs[pp].checked = true;
			worksheet["paymentPeriod"];
			toCalculate = toCalculate | 2;
		}
		hasHash = true;
	}
	if (params.has("inflationRate")) {
		let inflationRate = params.get("inflationRate").replace(/[^\d\.]/g, "");
		fcs["inflationRate"].value = inflationRate;
		toCalculate = toCalculate | 4;
		hasHash = true;
	}

	if (params.has("startDate")) {
		let sd = params.get("startDate");
		if (sd.match(/\d\d\d\d-\d\d-\d\d/)) {
			fcs["startDate"].value = sd;
			toCalculate = toCalculate | 8;
		}
		hasHash = true;
	}
	if (params.has("endDate")) {
		let sd = params.get("endDate");
		if (sd.match(/\d\d\d\d-\d\d-\d\d/)) {
			fcs["endDate"].value = sd;
			toCalculate = toCalculate | 16;
		}
		hasHash = true;
	}
	if (params.has("etfPrice")) {
		let etfPrice = params.get("etfPrice").replace(/[^\d\.]/g, "");
		fcs["etfPrice"].value = etfPrice;
		worksheet["etfPrice"] = etfPrice;
		toCalculate = toCalculate + 32;
		hasHash = true;
	}
	if (params.has("growthRate")) {
		let growthRate = params.get("growthRate").replace(/[^\d\.]/g, "");
		fcs["growthRate"].value = growthRate;
		toCalculate = toCalculate | 4;
		hasHash = true;
	}


	if (dbug) console.log ("toCalculate: " + toCalculate + ": " + toCalculate.toString(2) + ".");
	if (hasHash) {
		//calcBtn.focus();
		let clickEv = new Event("click");
		fcs["calcBtn"].dispatchEvent(clickEv);

	}
	return hasHash;


} // End of handleHash

// set the URL
function setURL () {
	//console.log ("Setting hash.");
	let url = new URL(document.location);
	let newURL = url.toString().replace(/#.*$/, "");
	newURL = newURL.replace(/\?.*$/, "");
	//let params = [];
	/*for (let id in filters) {
		if (!filters[id].checked) {
			params.push(id.replace("Chk", ""));
			if (id.match(/levelA/)) {
				params[params.length-1] += "$";
			}
		}
	}*/
	/*
	if (levelSel) saveValues["lvl"] = levelSel.selectedIndex);
	if (startDateTxt.value) ("strtdt=" +  startDateTxt.value);
	if (stepSelect) params.push("stp=" +  stepSelect.selectedIndex);
	if (endDateTxt.value) params.push("enddt=" +  endDateTxt.value);

	newURL += "?" + params.join("&");
	*/
	newURL += "?";
	/*saveValues.forEach(function (val, key, saveValues) {
		console.log ("adding " + key + "=" + val);
		newURL += key + "=" + val + "&";
		});
	newURL = newURL.substring(0, newURL.length - 1);
	*/
	let saveValues = [];
	for (let k in worksheet) {
		if (k != "acb") saveValues.push(k + "=" + worksheet[k]);
	}

	if (dbug) saveValues.push("dbug=true");
	if (showPrecise) saveValues.push("showPrecise=true");
	if (calcRounded) saveValues.push("calcRounded=true");
	newURL += saveValues.join("&");
	/*
	if (params.length > 0) {
		newURL += "?filters=" + params.join(sep) + (selectedTab != "" ? "&" + selectedTab : "") + url.hash;
	} else {
		newURL += (selectedTab != "" ? "?" + selectedTab : "") + url.hash;
	}
	*/
	history.pushState({}, document.title, newURL);
	

} // End of setURL


function getPayPeriod () {
	const payBtns = document.querySelectorAll("input[type=radio][name=payrate]");
	let payRate = null;
	for (let i = 0; i < payBtns.length && !payRate; i++) {
		if (dbug) console.log ("Checking i: " + i + ": " + payBtns[i].id + ".");
		if (payBtns[i].checked) payRate = payBtns[i].id;
	}
	return payRate;
} // End of getPayPeriod

function getDailyGrowthRate () {
	// =(present val/init val)^(1/periods) -1
	if (dbug) console.log ("input value: " + fcs["growthRate"].value + ".");
	const gr = parseInt(1) + ((parseInt(100) + parseInt(fcs["growthRate"].value))/100)**(1/261) -1;
	if (dbug) console.log ("GrowthRate: " + gr + ".");
	return gr;
} // End of getDailyGrowthRate



// Shamelessly stolen from https://stackoverflow.com/questions/5645058/how-to-add-months-to-a-date-in-javascript
Date.isLeapYear = function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () { 
    return Date.isLeapYear(this.getFullYear()); 
};

Date.prototype.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
	let n = this.getDate();
	if (dbug) console.log ("n: " + n + ".");
	this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
	if (dbug) console.log ("set date to " + this.getDate() + " and month to " + this.getMonth() + ".");
    return this;
};


function createHTMLElement (type, attribs) {
	let newEl = document.createElement(type);
	let fdbug = false; //(arguments.length == 3 &&arguments[2] != null && arguments[2] != false || dbug == true ? true : false);
	for (let k in attribs) {
		if (fdbug) console.log("Dealing with attrib " + k + ".");
		if (k == "parentNode") {
			if (fdbug) console.log("Dealing with parentnode.");
			let parentNode = getHTMLElement(attribs[k], dbug);

			try {
				if (attribs.hasOwnProperty("insertBefore")) {
					var beforeEl = getHTMLElement(attribs["insertBefore"], dbug);
					parentNode.insertBefore(newEl, beforeEl);
				} else if (attribs.hasOwnProperty("insertAfter")) {
					var afterEl = getHTMLElement(attribs["insertAfter"], dbug);
					parentNode.insertBefore(newEl, afterEl.nextSibling);
				} else {
					parentNode.appendChild(newEl);
				}
			}
			catch (er) {
				console.error("Error appending newEl to parentNode: " + er.message + ".");
			}
		} else if (k == "textNode" || k == "nodeText") {
			if (fdbug) console.log("Dealing with textnode " + attribs[k] + ".");
			if (typeof (attribs[k]) == "string") {
				if (fdbug) console.log("As string...");
				newEl.appendChild(document.createTextNode(attribs[k]));
			} else if (attribs[k] instanceof HTMLElement) {
				if (fdbug) console.log("As HTML element...");
				newEl.appendChild(attribs[k]);
			} else {
				if (fdbug) console.log("As something else...");
				newEl.appendChild(document.createTextNode(attribs[k].toString()));
			}
		} else if (k == "innerHTML") {
			if (fdbug) console.log ("Dealing with innerHTML " + attribs[k] + ".");
			newEl.innerHTML = attribs[k];
		} else if (k.match(/^insert(Before|After)$/)) {
				// Do nothing.
		} else if (k == "textContent") {
			newEl.textContent = attribs[k];
		} else {
			newEl.setAttribute(k, attribs[k]);
		}
	}
	return newEl;
} // End of createHTMLElement

function getHTMLElement (el) {
	let rv = null;
	let fdbug = (((arguments.length == 2 && arguments[1] != null && arguments[1] != undefined && arguments[1] !== false) || dbug == true) ? true : false); 
	//var iwin = window;
	if (el instanceof HTMLElement) { // || el instanceof iwin.HTMLElement) {
		rv = el;
	} else if (el instanceof String || typeof(el) === "string") {
		try {
			if (fdbug) console.log ("Trying to getHTMLElement " + el + ".");
			rv = document.getElementById(el);
		} catch (er) {
			console.error("Error getting HTML Element #" + el + ".  Apparently that's not on this page.");
		}
	}
	return rv;
} // End of getHTMLElement


function removeChildren (el) {
	var dbug = (arguments.length == 2 && arguments[1] != null && arguments[1] != false ? true : false);
	while (el.firstChild) {	
		el.removeChild(el.firstChild);
	}
} // End of removeChildren


var formatter = new Intl.NumberFormat("en-CA", {
  style: 'currency',
  currency: 'CAD',

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  // Taken from https://stackoverflow.com/questions/149055/how-to-format-numbers-as-currency-string
});


function getNum (num) {
	if (showPrecise) {
		if (calcRounded) {
			return formatter.format(num);
		} else {
			return num;
		}
	} else {
	
		return formatter.format(num);
	}
} // End of getNum



