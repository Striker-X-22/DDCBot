var Discord = require('discord.js');
var auth = require('./auth.json');
var data = require('./data.json');

var bot = new Discord.Client();
bot.once('ready', () => {
	console.log('');
	console.log('<><> Ready!');
});
/*

-o-Need to fix Announce() so that if the timer is very close but early before DDC begins at all, it doesn't skip announcing. Done, re-set timers.

--Need to add tt role pinging (suggestion by Zeph).

*/
const token = auth.token;
bot.login(token);

// Project data.
const prefix = data.prefix;
const mainChID = data.mainRedoutChID; // Where announcements are made.
const DDCStartStr = data.DDCStart;
// All events for DDC season 1. The durations will all be 2 day intervals, skipping Saturday: Sun-Mon, Tue-Wed, Thur-Fri. Calculated from a spreadsheet. Assumes starting on Sunday.
const DDCEvents = data.DDCEvents; // Technically only the ref is const.

// Other.
const msInDay = 1000*60*60*24;
const msInHour = 1000*60*60;
const msInMinute = 1000*60;
var timer1 = -1; // These timers are used for tracking the 3 different times a week events happen for DDC. When assigned by SetTimeout(), they are given the timer ID.
var timer2 = -1;
var timer3 = -1;

bot.once('ready', function (evt) {

	// First find the time on bot startup.
	console.log(""); // Pretty sure \n doesn't work here.
	console.log("<> Startup re-announcement code started.");
	var startupTime = new Date(); // Automatically sets to current time.
	var mainCh = bot.channels.get(mainChID); // Need channel ID, not sure if another way.
	console.log("<> mainCh: " + mainCh);
	
	// Determine time to first event.
	var ddcStart = new Date(DDCStartStr); // Defines "2019-07-14T19:00:00Z" as 2019 Jul 14th, 7pm, in UTC (the "Z"), etc. "T" is separator between date and time.
	var tDiff = ddcStart.getTime() - startupTime.getTime(); // Find time until ddcStart since startupTime.
	console.log("<> tDiff: " + tDiff + ", DDCStartStr: " +DDCStartStr+".");
	
	// Startup Re-Announcement.
	if (tDiff < 0) { // DDC is ongoing. Find current event.
		// Find days since DDC began.
		tDiff = -tDiff; // Make positive just for clarity.
		var daysNum = tDiff / msInDay; // Get days since DDC start, with decimal.
		console.log("<> daysNum (since DDC Start): " + daysNum);
		for (i = 0; i < DDCEvents.length; i++) {
			// Need to take into account Saturdays as "sabbaths" from 19:00 to 19:00 Sunday. Alternatively, just look 48 hours ahead, to the end of the event.
			if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+2) { // Is within time frame of event i.
				console.log("<> Re-Announce If: "+daysNum +">="+ DDCEvents[i].day +"&&"+ daysNum +"<"+ (DDCEvents[i].day+2) + " and i="+i);
				var timeLeft = new Date((DDCEvents[i].day+2 - daysNum) * msInDay);
				var lastEvent = "";
				if (i == DDCEvents.length-1) {
					lastEvent = " This is the **last** DDC challenge of Season 1!";
				}
				console.log("<> --Event found for startup! Re-Announcing event i="+i+". daysNum: " + daysNum + ", DDCEvents[i].title: "+DDCEvents[i].title + ", DDCEvents[i].day: "+DDCEvents[i].day);
				mainCh.send("_Double Day Challenge_ is currently:       _(Week " + Math.floor(1 + DDCEvents[i].day/7) + ")_\n**[_ -" + DDCEvents[i].title + "- _]**   Challenge ends in: " + FormatDuration(timeLeft.getTime()) + "." + lastEvent);
				// Set timers for next 3 events (since they vary every 3).
				if (lastEvent == "") { // Not last event.
					// Find which day it is:
					console.log("<> Calc timeToNext: ddcStart.getTime()="+ddcStart.getTime()+", DDCEvents[i+1].day="+DDCEvents[i+1].day+", DDCEvents[i+1].day*msInDay="+DDCEvents[i+1].day*msInDay+", startupTime.getTime()="+startupTime.getTime()+".");
					var timeToNext = ddcStart.getTime() + DDCEvents[i+1].day*msInDay - startupTime.getTime(); // Find time until event i+1 since startupTime.
					var day = DDCEvents[i+1].day % 7; // Which day. 0 = Sunday.
					console.log("<> Re-Announce trying to set timer. day: "+day+", timeToNext: "+timeToNext+", updateOneTimer: "+"true"+".");
					SetTimers(day, timeToNext);
				} else { // Last event already. Do nothing, I guess.
				}
				break;
			} else if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+3) { // Beyond event time start but not within, so may be wwg sabbath. The direction i is going means daysNum > [i].daysCount is always true here.
				if (i != DDCEvents.length-1){ if (!(daysNum >= DDCEvents[i+1].day && daysNum < DDCEvents[i+1].day+2)) { // Not actually just part of next event.
					// Since this is just for Re-Announcing on startup, no need to do it since WWG is on.
					// Need to set timers though since startup. If i were last event, it wouldn't matter.
					var timeToNext = ddcStart.getTime() + DDCEvents[i+1].day*msInDay - startupTime.getTime(); // Find time until event i+1 since startupTime.
					var day = DDCEvents[i+1].day % 7; // Which day. 0 = Sunday.
					console.log("<> WWG is on, setting timers.");
					SetTimers(day, timeToNext);
					break;
				}} // Wasn't sure if javascript allows early falsing of logical operators.
			}
		}
		console.log("<> end of IF tDiff < 0");
	} else { // DDC hasn't started yet. Do nothing for Re-announcing.
		// Set timers for next 3 events (since they vary every 3).
		// Find which day it is:
		var timeToNext = ddcStart.getTime() + DDCEvents[0].day*msInDay - startupTime.getTime(); // Find time until ddcStart since startupTime.
		var day = DDCEvents[0].day % 7; // Which day. 0 = Sunday.
		console.log("<> DDC not started, setting timers.");
		SetTimers(day, timeToNext);
	} // End of startup announcement logic.
	
}); // bot once ready.


bot.on('message', message => {
	
	// Current DDC event and time left.
	if (message.content.toLowerCase() === prefix+"ddc" || message.content.toLowerCase() === prefix+"ddctime"){
		AskEvent(message.channel);
	}
	// Rules and schedule for the DDC events. Links to a spreadsheet. Can put link in code block (`link`) to suppress creating an image if desired, but this will also suppress the clickable link. Some other general track / career info included.
	if (message.content.toLowerCase() === prefix+"ddcrules" || message.content.toLowerCase() === prefix+"ddchelp" || message.content.toLowerCase() === prefix+"ddcschedule"){ 
		message.channel.send("**Double Day Challenge** rules and schedule: https://docs.google.com/spreadsheets/d/1oaKATg5Jt50SB49Wr-4etW6gVNXxJAXcZwPUQWDzmck/edit?usp=sharing + other general track / career info included.");
	}
	// Help command list.
	if (message.content.toLowerCase() === prefix+"help"){
		message.channel.send("_ _\n`"+prefix+"ddc / ddctime` - Shows the current Double Day Challenge scenario, and how much time until it changes.\n"+
		"`"+prefix+"ddcrules / ddchelp / ddcschedule` - Rules and schedule for the DDC events. Links to a spreadsheet. Some other general track / career info included.");
	}
}); // bot on message.

// Functions:

function Announce() { // Ended up being pretty much a copy/paste of startup re-announcement.
	// First find the time.
	console.log(""); // Pretty sure \n doesn't work here.
	console.log("<> Announce() called.");
	var curTime = new Date(); // Automatically sets to current time.
	var mainCh = bot.channels.get(mainChID); // Need channel ID, not sure if another way.

	// Determine time to first event.
	var ddcStart = new Date(DDCStartStr); // Defines "2019-07-14T19:00:00Z" as 2019 Jul 14th, 7pm, in UTC (the "Z"), etc. "T" is separator between date and time.
	var tDiff = ddcStart.getTime() - curTime.getTime(); // Find time until ddcStart since curTime. 
	console.log("<> tDiff: " + tDiff);
	
	// Announcement.
	if (tDiff < 0) { // DDC is ongoing. Find current event.
		// Probably need to check times to make sure we don't catch the end of the previous event, and set the timers again but without announcing, to make up for any timing issues. Done below before actually sending the announcement.
		// Find days since DDC began.
		tDiff = -tDiff; // Make positive just for clarity.
		var daysNum = tDiff / msInDay; // Get days since DDC start, with decimal.
		console.log("<> daysNum (since DDC Start): " + daysNum);
		for (i = 0; i < DDCEvents.length; i++) {
			// Need to take into account Saturdays as "sabbaths" from 19:00 to 19:00 Sunday. Alternatively, just look 48 hours ahead, to the end of the event.
			if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+2) { // Is within time frame of event i.
				console.log("<> Announce() If: "+daysNum +">="+ DDCEvents[i].day +"&&"+ daysNum +"<"+ (DDCEvents[i].day+2) + " and i="+i);
				var timeLeft = new Date((DDCEvents[i].day+2 - daysNum) * msInDay);
				var lastEvent = "";
				console.log("<> --Event found for Announce! Announcing event i="+i+". daysNum: " + daysNum + ", DDCEvents[i].title: "+DDCEvents[i].title + ", DDCEvents[i].day: "+DDCEvents[i].day);
				if (i == DDCEvents.length-1) {
					lastEvent = " This is the **last** DDC challenge of Season 1!";
					timer1 = 0; // No need for timers anymore. Bot will have to be reset with new code for next season.
					timer2 = 0;
					timer3 = 0;
				}
				if (timeLeft >= 30*msInMinute) { // Hopefully timing is never off by more than half an hour. If it is, it should simply re-announce the old event then announce the new one at around the right time.
					// "**Double Day Challenge** is now _**-Surface Sprint: IV Time Attack-**_ for 48 hours (Week 20)." *** @StrikerX22#3213.
					mainCh.send("@StrikerX22#3213 _Double Day Challenge_ is now:       _(Week " + Math.floor(1 + DDCEvents[i].day/7) + ")_\n**[_ -" + DDCEvents[i].title + "- _]**   for 48 hours." + lastEvent);
				} else {
					// Seems to be early in timing, trying to announce the same event again before actual time is completely up and next event is out. Just proceed and still set timers.
					console.log("<> *Error*: Tried to announce early. Just setting timers again.");
				}
				// Set timers for next 3 events (since they vary every 3).
				if (lastEvent == "") { // Not last event.
					// Find which day it is:
					console.log("<> Calc timeToNext: ddcStart.getTime()="+ddcStart.getTime()+", DDCEvents[i+1].day="+DDCEvents[i+1].day+", DDCEvents[i+1].day*msInDay="+DDCEvents[i+1].day*msInDay+", startupTime.getTime()="+curTime.getTime()+".");
					var timeToNext = ddcStart.getTime() + DDCEvents[i+1].day*msInDay - curTime.getTime(); // Find time until event i+1 since curTime.
					var day = DDCEvents[i+1].day % 7; // Which day. 0 = Sunday.
					console.log("<> Announce trying to set timer. day: "+day+", timeToNext: "+timeToNext+", updateOneTimer: "+"true"+".");
					SetTimers(day, timeToNext, true); // Not using last optional term currently. Just setting all timers instead.
				} else { // Last event already. Do nothing, I guess.
				}
				break;
			} else if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+3) { // Beyond event time start but not within, so may be wwg sabbath. The direction i is going means daysNum > [i].daysCount is always true here.
				if (i != DDCEvents.length-1){ if (!(daysNum >= DDCEvents[i+1].day && daysNum < DDCEvents[i+1].day+2)) { // Not actually just part of next event.
					console.log("<> *Error*: Tried to announce during WWG. Re-setting timers.");
					var timeToNext = ddcStart.getTime() + DDCEvents[i+1].day*msInDay - curTime.getTime(); // Find time until event i+1 since curTime.
					var day = DDCEvents[i+1].day % 7; // Which day. 0 = Sunday.
					SetTimers(day, timeToNext);
					break;
				}} // Wasn't sure if javascript allows early falsing of logical operators.
				/*else {
					// Since this is just for Announcing on schedule, this shouldn't happen since WWG is on.
					console.log("<> *Error*: Tried to announce during WWG, and last event was on(?).")
					break;
				}*/
			}
		}
		console.log("<> end of IF tDiff < 0");
	} else { // DDC hasn't started yet. Must be erroring somehow.
		console.log("<> *Error*: Tried to announce before DDC started. Re-setting timers.");
		SetTimers(0, ddcStart.getTime()); // Do need to re-set timer so that it fires again.
	}
} // Announce()


function AskEvent(ch) { // User asks the current event and time left. ch is channel. Mostly copy and paste of startup. Does not re-set the timers.
	var curTime = new Date(); // Automatically sets to current time.
	console.log(""); // Pretty sure \n doesn't work here.
	console.log("<> AskEvent() called. ch: " + ch);
	
	// Determine time to first event.
	var ddcStart = new Date(DDCStartStr); // Defines "2019-07-14T19:00:00Z" as 2019 Jul 14th, 7pm, in UTC (the "Z"), etc. "T" is separator between date and time.
	var tDiff = ddcStart.getTime() - curTime.getTime(); // Find time until ddcStart since curTime.
	console.log("<> tDiff: " + tDiff);
	
	// Response to asking.
	if (tDiff < 0) { // DDC is ongoing. Find current event.
		// Find days since DDC began.
		tDiff = -tDiff; // Make positive just for clarity.
		var daysNum = tDiff / msInDay; // Get days since DDC start, with decimal.
		console.log("<> daysNum (since DDC Start): " + daysNum);
		for (i = 0; i < DDCEvents.length; i++) {
			// Need to take into account Saturdays as "sabbaths" from 19:00 to 19:00 Sunday. Alternatively, just look 48 hours ahead, to the end of the event.
			if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+2) { // Is within time frame of event i.
				console.log("<> Announce() If: "+daysNum +">="+ DDCEvents[i].day +"&&"+ daysNum +"<"+ (DDCEvents[i].day+2) + " and i="+i);
				var timeLeft = new Date((DDCEvents[i].day+2 - daysNum) * msInDay);
				var lastEvent = "";
				console.log("<> --Event found for Ask! Responding. Replying with event i="+i+". daysNum: " + daysNum + ", DDCEvents[i].title: "+DDCEvents[i].title + ", DDCEvents[i].day: "+DDCEvents[i].day);
				if (i == DDCEvents.length-1) {lastEvent = " This is the **last** DDC challenge of Season 1!";}
				ch.send("_Double Day Challenge_ is currently:       _(Week " + Math.floor(1 + DDCEvents[i].day/7) + ")_\n**[_ -" + DDCEvents[i].title + "- _]**   Challenge ends in: " + FormatDuration(timeLeft.getTime()) + "." + lastEvent);
				break;
			} else if (daysNum >= DDCEvents[i].day && daysNum < DDCEvents[i].day+3) { // Beyond event time start but not within, so may be wwg sabbath. The direction i is going means daysNum > [i].daysCount is always true here.
				if (i != DDCEvents.length-1){ if (!(daysNum >= DDCEvents[i+1].day && daysNum < DDCEvents[i+1].day+2)) { // Not actually just part of next event.
						console.log("<> Asking during WWG.");
						var timeToNext = ddcStart.getTime() + DDCEvents[i+1].day*msInDay - curTime.getTime(); // Find time until event i+1 since curTime.
						ch.send("_Double Day Challenge_ is disabled from when WWG starts, to 24 hours after.\n"+"Next challenge begins in: " + FormatDuration(timeToNext) + ".  _(end of Week " + Math.floor(1 + DDCEvents[i].day/7) + ")_");
						break;
				}} // Wasn't sure if javascript allows early falsing of logical operators. 
			}
			if (i == DDCEvents.length-1) { // Reached end of list without finding event. DDC is over, give message.
				ch.send("**Double Day Challenge League** Season 1 is over. Feel free to request Season 2 and make suggestions.");
			}
		}
		console.log("<> end of IF tDiff < 0");
	} else { // DDC hasn't started yet. Tell them when it starts.
		console.log("<> Asking before DDC begins.");
		var timeToNext = ddcStart.getTime() + DDCEvents[0].day*msInDay - curTime.getTime(); // Find time until ddcStart since curTime.
		ch.send("_Double Day Challenge_ has not begun yet!\nFirst challenge begins in: " + FormatDuration(timeToNext) + ".");
	}
} // AskEvent()


function SetTimers(dayNumID, timeToNextInMS, updateOneTimer=false) {
	console.log("<> Timer(s) being set. day = "+dayNumID+", timeToNext = "+timeToNextInMS+", updateOneTimer = "+updateOneTimer+"." );
	// Probably no particular reason not to just set all 3 timers each time every announcement. Thus, updateOneTimer is unused.
	var debug = "";
	if (dayNumID == 0) {
		timer1 = setTimeout(Announce, timeToNextInMS); debug +=	"timer1 = "+timeToNextInMS;
		timer2 = setTimeout(Announce, timeToNextInMS + 2*msInDay); debug +=	", timer2 = "+(timeToNextInMS+2*msInDay);
		timer3 = setTimeout(Announce, timeToNextInMS + 4*msInDay); debug +=	", timer3 = "+(timeToNextInMS+4*msInDay);
	}
	else if (dayNumID == 2) {
		timer2 = setTimeout(Announce, timeToNextInMS); debug +=	"timer2 = "+timeToNextInMS;
		timer3 = setTimeout(Announce, timeToNextInMS + 2*msInDay); debug +=	", timer3 = "+(timeToNextInMS+2*msInDay);
		timer1 = setTimeout(Announce, timeToNextInMS + 5*msInDay); debug +=	", timer1 = "+(timeToNextInMS+5*msInDay); // Skip 1 for WWG sabbath.
	}
	else if (dayNumID == 4) {
		timer3 = setTimeout(Announce, timeToNextInMS); debug +=	"timer3 = "+timeToNextInMS;
		timer1 = setTimeout(Announce, timeToNextInMS + 3*msInDay); debug +=	", timer1 = "+(timeToNextInMS+3*msInDay); // Skip 1 for WWG sabbath.
		timer2 = setTimeout(Announce, timeToNextInMS + 5*msInDay); debug +=	", timer2 = "+(timeToNextInMS+5*msInDay);
	}
	else {console.log("<> *Error*: Weird day number.");}
	console.log("<> Timers now: "+debug+"." );
}


function FormatDuration(ms) { // Takes milliseconds.
	var days = Math.floor(ms / msInDay); ms = ms % msInDay; // .floor because there's no integer division operator that I know of.
	var hours = Math.floor(ms / msInHour); ms = ms % msInHour;
	var minutes = Math.floor(ms / msInMinute); ms = ms % msInMinute;
	var seconds = Math.floor(ms / 1000);
	
	var result = String(hours) + ":";
	if (days > 1) {result = days + " days, " + result;}
	else if (days == 1) {result = days + " day, " + result;}
	else {result = "0 days, " + result;} // Listing 0 days to be clear that it is multiple days total.
	if (seconds == 60) {minutes = (minutes+1) % 60; seconds = 0;}
	if (minutes < 10) { result += "0" + minutes+":";}
	else {result+= minutes+":";}
	if (seconds < 10) { result += "0" + seconds;}
	else {result+= seconds;}
	return result; //+ " (H:MM:SS)";
}

// Javascript Time notes:
// Define UTC time with the Z in: d = new Date("2019-07-14T19:00:00Z");
// d.getTime() gives milliseconds since 1970 UTC, as opposed to .getMilliseconds, which is only the milliseconds component of the date from 0-999.
// getHours() etc. display local time, even if Date object is defined with UTC.
// d1 - d2 works, giving ms result, so getTime() is not needed in this particular operation. It doesn't seem to work with +, so maybe just always use .getTime().
// d = new Date([some ms]) works. This is UTC. If it is a very small number, like an hour, and you ask to display the date, it will choose local time as normal, and if you're negative from GMT/UTC, this will show before 1970 (the minimum date). Negative dates fail, and maybe don't store but this has to do with whether variable conversion happens or not.
// d = new Date(2019, 6, 14, 19, 0, 0, 0); is _not_ UTC. Thus it is not equal to:  new Date("2019-07-14T19:00:00Z"); // 2019 Jul 14th, 7pm. Also note the different month convention.
