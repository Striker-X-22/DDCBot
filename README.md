# DDCBot
A discord bot meant for #Redout (game). Purpose is to announce a list of events on certain days. Javascript.

Commands:

if (message.content.toLowerCase() === prefix+"help"){
	message.channel.send("_ _\n`"+prefix+"ddc / ddctime` - Shows the current Double Day Challenge scenario, and how much time until it changes.\n"+
	"`"+prefix+"ddcrules / ddchelp / ddcschedule` - Rules and schedule for the DDC events. Links to a spreadsheet. Some other general track / career info included.");
}
