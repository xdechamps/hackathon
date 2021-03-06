var builder = require('botbuilder');
var restify = require('restify');
var request = require ('superagent');
var winston = require('winston');

winston.level = 'debug';

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'somefile.log' })
    ]
  });

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PWD
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=19ea5fce-54cc-4cd5-aa58-bd7109dfa633&subscription-key=7c18d4f68f924a21b16e21a0fcb68da7';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', dialog);
// Find a match with Luis
dialog.matches('FindRecipe', [

  function(session, args){  
      winston.log(session.userData);      
      var ingredients = builder.EntityRecognizer.findAllEntities(args.entities, 'Ingredients');
      var results = ingredients.map(cur => cur.entity);
      var stringResult = results.toString();
      session.userData.askedIngredients = stringResult;
      var tableOfRecipes = [];
      var first3recipes = [];
      
      session.send('You asked for %s', stringResult);        

      request
          .get("https://api.edamam.com/search?q="+stringResult+"&app_id=af13cdfd&app_key=0da1a28420e7d1c6d55fe527499289a5")
          .end(function(err, res) {
          if (err || !res.ok) {
              console.log(err);
          }
          else {
               for(var i =0; i < res.body.hits.length;i++){
                tableOfRecipes[i] = res.body.hits[i].recipe.label;
               }
               for(var j =0; j < 3;j++){
                first3recipes[j] = tableOfRecipes[j];
              }
               first3recipes[3] = "None of these?";
          }
        builder.Prompts.choice(session, "Here is 3 recipes", first3recipes);
        session.userData.allRecipes = tableOfRecipes;
        session.save();
      })
    },
    function(session, results, next){
        var index = 3;
        var tempRecipes = session.userData.allRecipes.slice(index, index+3);
        session.userData.chosenRecipe = results.response.entity;
        if(session.userData.chosenRecipe == "None of these?"){
           tempRecipes[index] = "None of these?";
           builder.Prompts.choice(session, "All right then here is 3 more!", tempRecipes);  
        }
        else{
           var ingredients;
           console.log('je suis ici' + session.userData.chosenRecipe);
            request
            .get("https://api.edamam.com/search?q="+session.userData.chosenRecipe+"&app_id=af13cdfd&app_key=0da1a28420e7d1c6d55fe527499289a5")
            .end(function(err, res) {
            if (err || !res.ok) {
                console.log(err);
            }
            else {
                ingredients = res.body.hits[0].recipe.ingredientLines.toString();
            }
            console.log(ingredients);
            session.send('Here are the ingredients %s', ingredients)
            session.endDialog();
            })
        }
    },
    function(session, results, next){
        var index = 6;
        var tempRecipes = session.userData.allRecipes.slice(index, index+4);
        if(results.response && results.response.entity !== "None of these?"){
            session.userData.chosenRecipe = results.response.entity;
        }
        if(session.userData.chosenRecipe == "None of these?"){
            tempRecipes[index-3] = "None of these?";
            builder.Prompts.choice(session, "All right then here are the last four", tempRecipes);  
        } else{
           var ingredients;
            request
            .get("https://api.edamam.com/search?q="+session.userData.chosenRecipe+"&app_id=af13cdfd&app_key=0da1a28420e7d1c6d55fe527499289a5")
            .end(function(err, res) {
            if (err || !res.ok) {
                console.log(err);
            }
            else {
                ingredients = res.body.hits[0].recipe.ingredientLines.toString();
            }
            session.send('Here are the ingredients %s', ingredients)
            session.endDialog();
            })
        }
    },
    function(session, results){
        if(results.response && results.response.entity !== "None of these?"){
            session.userData.chosenRecipe = results.response.entity;
        }
        if(session.userData.chosenRecipe == "None of these?"){
             session.send("I am so sorry but I don't have any more recipes with those ingredients! Would like something else?");
             session.endDialog();
        } else{
            var ingredients = [];
            request
            .get("https://api.edamam.com/search?q="+session.userData.chosenRecipe+"&app_id=af13cdfd&app_key=0da1a28420e7d1c6d55fe527499289a5")
            .end(function(err, res) {
            if (err || !res.ok) {
                console.log(err);
            }
            else {
                ingredients = res.body.hits[0].recipe.ingredientLines.toString();
            }
            session.send('Here are the ingredients %s', ingredients)
            session.endDialog();
            })
        }
    }
]);

dialog.onDefault([
    function(session, args, next){
        if(!session.userData.state){
            session.beginDialog('/introduction');
        } else {
            session.send("Je n'ai pas bien compris, pouvez-vous repetez?");
            next();
        }
    }
]);

bot.dialog('/introduction',[
    function(session){
         builder.Prompts.text(session, 'Hi! How are you?');
    },
    function (session, results) {
        session.userData.state = results.response;
        session.send('What do you want to eat?');
        session.endDialog();
    }
])