import bpm from './bpm.js'
import events from './events.js'
import utils from './utils.js'
import _ from 'underscore'

let quests = new (function() {
    // Contains all quests
    this.all = {};

    // Contains all possible objectives a quest can have.
    this.objectives = {};

    // Calls update on the objective for the current quest. If update returns true then the objective is complete.
    this.updateObjective = function(objectiveName, eventObject) {
        if (bpm.player.currentQuest) {
            var objective = bpm.player.currentQuest.objectives[objectiveName];

            if (objective) {
                if (objective.update(eventObject)) {
                    objective.complete();
                }
            }
        }
    };

    // A comparator used to sort a list of quest ids.
    var priorityIds = ['ma', 'mb']; // Order is important here. Earlier indices have higher priority.
    this.idComparator = function(a, b) {
        var stringRegex = /[a-z]+/;
        var numberRegex = /[0-9]+/;
        let stringA = stringRegex.exec(a)[0];
        let stringB = stringRegex.exec(b)[0];
        let numberA = parseInt(numberRegex.exec(a)[0], 10);
        let numberB = parseInt(numberRegex.exec(b)[0], 10);

        for (var i=0; i<priorityIds.length; ++i) {
            var str = priorityIds[i];
            if (stringA === str && stringB !== str) {
                return -1;
            } else if (stringA !== str && stringB === str) {
                return 1;
            }
        }

        // If the strings are similar or not in the priority list then we sort based on their number.
        return numberB - numberA;
    };

    // Creates a new objective for quests and puts it in quests.objectives.
    var addObjective = (name, update, genDescription, extension) => {
        this.objectives[name] = _.extend({
            name: name,
            update: update,
            genDescription: genDescription,
        }, extension);
    };

    // Creates a new quest instance and puts it in quests.all.
    var addQuest = (id, quest) => {
        quest.id = id;
        quest.completed = false;
        quest.completedObjectives = [];

        quest.onObjectiveComplete = function(objective) {
            quest.completedObjectives.push(objective);

            // Check if all objectives are completed.
            for (var key in quest.objectives) {
                if (quest.objectives[key].completed) {
                    quest.completed = true;
                } else {
                    quest.completed = false;
                    break;
                }
            }

            console.log("Objective '" + objective.description + "' completed for quest '" + quest.name + " (" + id + ")'!");

            if (quest.completed) {
                console.log("'" + quest.name + " (" + id + ")' completed!");
            }
        };

        // Objectives currently are in the format of 'name: value'. We need to convert that into a new object to give more info.
        for (var key in quest.objectives) {
            var cachedObjective = this.objectives[key]; // The objective from the list of all possible objectives.

            if (!cachedObjective) {
                console.error("Objective '" + key + "' does not exist in the list of possible objectives.");
            } else if (!cachedObjective.update) {
                console.error("Objective '" + key + "' does not have an update function defined.");
            }

            var goal = quest.objectives[key];

            // Generate this objectives unique description.
            var genDescription = cachedObjective.genDescription;
            var hidden = true;
            var description = '';
            var genStatus;

            // If there's a description generator then we can assume that this objective should be visible.
            if (genDescription) {
                hidden = false;
                description = genDescription(goal);

                // If genDescription returns an array then that means we also have a genStatus to create.
                if (_.isArray(description)) {
                    description = description[0];
                    (function(genDescription, goal) {
                        genStatus = function(status) {
                            return genDescription(goal, status)[1];
                        };
                    })(genDescription, goal);
                }
            }

            var objective = _.extend({
                description: description,
                genStatus: genStatus,
                goal: goal,
                status: 0,
                completed: false,
                hidden: hidden,
            }, cachedObjective);

            // The training objective/quest is a free-for-all so it should automatically be completed.
            if (key === 'training') {
                objective.completed = true;
                quest.completed = true;
            }

            objective.complete = function() {
                if (!this.completed) {
                    this.completed = true;
                    if (quest.onObjectiveComplete) {
                        quest.onObjectiveComplete(this);
                    }
                }
            };

            quest.objectives[key] = objective;
        }

        this.all[id] = quest;
    };

    // Parses JSON for quest data and adds them.
    this.addJsonQuests = function(json) {
        var quests = JSON.parse(json);
        for (var key in quests) {
            addQuest(key, quests[key]);
        }
    };

    // Add objectives
    addObjective('training', function() {return true;});

    addObjective('multiplier', function(e) {
        return (e.multiplier >= this.goal);
    }, function(goal) {
        return 'Reach a multiplier of ' + goal;
    });

    addObjective('popBubbles', function(e) {
        this.status++;
        return (this.status >= this.goal);
    }, function(goal, status) {
        return ['Pop ' + goal + ' bubbles',
                status + ' / ' + goal + ' bubbles popped'];
    });

    return {
        all: this.all,
        updateObjective: this.updateObjective,
        idComparator: this.idComparator,
        addJsonQuests: this.addJsonQuests,
    };
})();
export default quests;
