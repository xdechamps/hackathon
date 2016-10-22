var builder = require('botbuilder');
var _ = require('lodash');

var recipesJSON = [
    {
        "id":1,
        "titre": "Poulet au curry",
        "Ingredients": ["chicken", "curry"]
    },
    {
        "id":2,
        "titre": "Tomate et pain",
        "Ingredients":["tomatoes"]
    },
    {
        "id":3,
        "titre": "Poulet andalouse",
        "Ingredients": ["chicken", "andalouse"]
    },
];
/*var restify = require('restify');
//Set up restify server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());
*/
var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=19ea5fce-54cc-4cd5-aa58-bd7109dfa633&subscription-key=7c18d4f68f924a21b16e21a0fcb68da7';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', dialog);

dialog.matches('FindRecipe', [

    function(session, args){
        //var task = builder.EntityRecognizer.findEntity(args.entities, 'Ingredients');
        var ingredients = builder.EntityRecognizer.findAllEntities(args.entities, 'Ingredients');
        var results = ingredients.map(cur => cur.entity);
        //console.log(results);
        //console.log(ingredients);
        //var result = task2.reduce(( pre, cur ) => Math.max( pre.entity + ' ' + cur.entity + ' '));

        // the code you're looking for
        var needle = results;//.toString();
        var topRecipe = [];
        // iterate over each element in the array
        for (var i = 0; i < recipesJSON.length; i++){
            console.log('i', i);
            for (var j = 0; j < recipesJSON[i].Ingredients.length; j++){
                console.log('j', j);
                if (needle.indexOf(recipesJSON[i].Ingredients[j]) !== -1){
                    var foundRecipe = _.find(topRecipe, {id: recipesJSON[i].id});
                    if (!foundRecipe) {
                        topRecipe.push({id: recipesJSON[i].id, pts: 1});
                    } else {
                        
                        foundRecipe.pts++;
                        console.log("increment ", foundRecipe);
                    
                    }
                    
                } else {
                    console.log("Ingredient not found in ", recipesJSON[i].Ingredients[j]);
                }
            }
        }
        
        var sortedResults = _.orderBy(topRecipe, ["pts"], ["desc"]);
    
        if (sortedResults.length > 0){
            session.send("Best recipe: %s", _.find(recipesJSON, {id: sortedResults[0].id}).titre);
        }
        else{
            session.send("No result found");
        }
        //session.send(recipesJSON[i].titre);
        console.log(needle, sortedResults);
        //console.log(recipesJSON[1].Ingredients);
        //console.log(recipesJSON.recipes.Ingredients.toString());
        //session.send('You asked for %s', results.toString());
    }
]);

dialog.onDefault(builder.DialogAction.send('Oups'));