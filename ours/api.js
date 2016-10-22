var builder = require('botbuilder');
var request = require ('superagent');
var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=19ea5fce-54cc-4cd5-aa58-bd7109dfa633&subscription-key=7c18d4f68f924a21b16e21a0fcb68da7';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({
    recognizers: [recognizer]
});dialog.matches('FindRecipe', [   function(session, args){
    var ingredients = builder.EntityRecognizer.findAllEntities(args.entities, 'Ingredients');
    var results = ingredients.map(cur => cur.entity);
    var stringResult = results.toString();

    session.send('You asked for %s', stringResult);
    // Request to API database       request
    .get("https://api.edamam.com/search?q="+stringResult+"&app_id=af13cdfd&app_key=0da1a28420e7d1c6d55fe527499289a5")
        .end(function(err, res) {
            if (err || !res.ok) {
                console.log(err);
            }
            else {
                for(var i =0; i < res.body.hits.length;i++){
                    console.log(res.body.hits[i].recipe.label);
                }
                // Show first result (Recipe name)
                //console.log(res.body.hits[0].recipe.label);
            }
        });
}
]);bot.dialog('/', dialog);