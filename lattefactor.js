var dbug = true;
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
	"etfPrice" : null,
	"growthRate" : null
}
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
				console.log ("Tomorrow is " + tomorrow + ".");
				fcs[control].value = tomorrow.toISOString().substring(0,10);
				//fcs[control].addEventListener("change", calculate, false);
			} else if (control == "endDate") {
				const lastday = new Date(tomorrow.getFullYear()+5, tomorrow.getMonth(), tomorrow.getDate());
				
				console.log ("Today is " + today + ".");
				fcs[control].value = lastday.toISOString().substring(0,10);;
			} else if (control == "calcBtn") {
				fcs[control].addEventListener("click", calculate, false);
			} else if (false && dbug && (control == "month" || control == "fortnight")) {
				console.log (control + ": " + fcs[control].checked +".");
			}
		}
	}
	catch (ex) {
		console.error ("Caught exception: " + ex.message);
	}
	if (dbug) console.log ("inited.");
} // End of init

function calculate () {
	// Gather Data
	let cost = fcs["paymentAmnt"].value;
	const inflationRate = fcs["inflationRate"].value/100;
	const startDate = fcs["startDate"].value;
	const endDate = fcs["endDate"].value;
	let etfPrice = fcs["etfPrice"].value;
	let growthRate = getDailyGrowthRate(); 


	if (dbug) console.log ("Calculating....");
	let paymentPeriod = getPayPeriod(); //(fcs["month"].checked ? 12 : 26);
	if (dbug) console.log ("Got payrate: " + paymentPeriod + ".");

	let account = 0;
	let shares = 0;

	let dparts = startDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
	let current = new Date(dparts[1], dparts[2]-1, dparts[3]);
	let nextBuyDay = new Date(dparts[1], dparts[2]-1, dparts[3]);
	let nextInflationDay = new Date(parseInt(dparts[1]) + parseInt(1), dparts[2]-1, dparts[3]);

	let parts = endDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
	let future = new Date(parts[1], parts[2]-1, parts[3]);
	console.log ("Starting with current: " + current.toISOString().substring(0,10) + ", and nextBuyDay is: " + nextBuyDay.toISOString().substring(0,10) + ", and will keep going until " + future.toISOString().substring(0,10) + ".");
	while (current < future) {
		if (current.toISOString().substring(0,10) == nextInflationDay.toISOString().substring(0,10)) {
			console.log ("Since current is " + current.toISOString().substring(0,10) + ", and nextInflationDay is " + nextInflationDay.toISOString().substring(0,10) +", I'm inflating the price.");
			cost = cost * (parseInt(1) + parseFloat(inflationRate));
			nextInflationDay.setFullYear(parseInt(current.getFullYear()) + parseInt(1));
			console.log ("Setting next inflation date to " + nextInflationDay.toISOString().substring(0,10) + ".");
		}
		//if (dbug) console.log ("Now calculating for day " + current.toString() + ".");
		//console.log ("Comparing " + current.toISOString().substring(0,10) + " to " + nextBuyDay.toISOString().substring(0,10)  + ".");
		if (current.toISOString().substring(0,10) == nextBuyDay.toISOString().substring(0,10)) {
			//console.log ("It's " + nextBuyDay.toISOString().substring(0,10) + ", so I'm going to save the $ " + cost + ".");
			account += parseFloat(cost);
			if (account >= etfPrice) {
				account = account - etfPrice;
				shares++;
			}
			if (paymentPeriod == "everyday") {
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
				nextBuyDay.setDate(nextBuyDay.addMonths(1));
			}

		}
		
		if (current.getDay() > 0 && current.getDay() < 6) {	// don't calculate weekends
			// increaese the etf price
			etfPrice = etfPrice * growthRate;
			//if (dbug) console.log ("Now day is " + current.toString() + ".");
		}
		current.setDate(current.getDate() + parseInt(1));
	}
	console.log ("Ending with with current: " + current.toISOString().substring(0,10) + ", and nextBuyDay is: " + nextBuyDay.toISOString().substring(0,10) + ", and will keep going until " + future.toISOString().substring(0,10) + ".");

	if (dbug) {
		console.log ("ETF Price is now: " + etfPrice + ", and the cost is now $" + cost + ".");
		console.log ("And you have " + shares + " shares, which is now worth $" + (shares * etfPrice) + ".");
		console.log ("And your account is worth $"  + account + ".");
		console.log ("For a total amount of $" + (parseFloat(account) + (shares * etfPrice)) + ".");
	}
	/*
	let payment = fcs["paymentAmnt"].value;
	let c = fcs["inflationRate"].value /(paymentPeriod * 100);
	let d = (c+1);
	let n = fcs["amort"].value * paymentPeriod;
	fcs["amortOutput"].textContent = fcs["amort"].value;
	if (dbug) {
		console.log ("Calculating payment of $" + payment + " at inflation rate of " + c + "% for " + n + " " + paymentPeriod + ".");
		console.log ("d: " + d + ".");
		console.log ("d^n: " + d**n + ".");
	}
	let L = (payment *(((1+c)**n)-1))/(c*(1+c)**n);
	fcs["resultsOutput"].innerHTML = L.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
	if (dbug) console.log ("Calculated $" + L);
	*/

} // End of calculate

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
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};
