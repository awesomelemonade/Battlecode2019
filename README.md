# 2950 lines of Javascript AI - An MIT Battlecode 2019 Writeup

2019: CitricSky - 3rd place (Finalists)\
2018: CitricSky - Top 16 (Finalists)\
2017: ANinjaz - Top 48/64\
<sub><sup>All placings concern the main bracket (and not the high school bracket)</sup></sub>

### Introduction - Why did I write this?

It's that time of the year again! A month-long constant grind to achieve the invaluable experience of travelling to MIT and glorious fame of (owait there is prize money too ;o). For the past few years, I have participated in Battlecode, but I had never written any sort of writeup. It was only until Cixelyn (Cory Li, MIT 2012, @Cixelyn), a previous winner of battlecode (and also wrote a fascinating post mortem link here), protested that we should write more post mortems.

![Cixelyn1](writeup-images/Cixelyn1.png)

![Cixelyn2](writeup-images/Cixelyn2.png)

Quite frankly, I simply did not have anything interesting to write about in previous years, and thus did not pursue any sort of writeup. However, this year, although we (spoilers) did not win, it certainly has been an adventurous journey in not only programming our bot, but also in socializing with the devs, sponsors, and other teams at the finals.

### Initial Preparation

Coming into my third year of MIT Battlecode, I was motivated to make this year our best performance yet. One of my current philosophy in these competitions is to always strive for #1. Decisions should be made with the goal of reaching first place instead of the "I should cut my losses" mindset. In addition, it is important for me to pursue long term learning goals that pertain to the real world. As a high school student, I realized that it is not a time for me to make products or start a company and save the world from global warming or achieve world peace at this age. After all, there are over 7 billion people in the world and a great majority have more experience than I do. Certainly there are a significant number of people that are smarter in many areas than I am, so how would I be able to solve worldly problems as a measly high school student? Therefore, I sought to focus on education and learning tools and ideas that can prepare me to solve these problems for the future.

I was preparing myself for the four-week grind over MIT's Independent Activities Period long before it actually started. One thing that I heard about was from last year's #1 team Orbitary Graph (Side note: I also talked to Standard Technology during the finals, and they also considered using something similar based off an open source project a previous battlecoder (bovard) had created: https://github.com/bovard/archon). Orbitary Graph had a "battlestation" where they could have bots play other versions of their bots automagically. Rule based (handcoded non-machine-learning) bots often have many "magic values" used for heuristics. Having this battlestation can produce fast, convenient, and reliable results to assist in creating a more fluid feedback loop to help change constants. Unfortunately, even if I knew about bovard's archon project beforehand, it would not have been easily adaptable to the new Javascript stack used in Battlecode 2019.


While I never got around to finish creating this battlestation, it did not stop me from trying. In fact, I wanted to create this "Bot Arena" since Halite III, with the idea of implementing a trueskill leaderboard that mirrors Halite's leaderboard. (Side note: In retrospect, a trueskill leaderboard would never have been efficient in Battlecode 2019 due to the amount of computation power it takes to run one game.) With familiarity with Java, Python, and similar languages, I had reasonable experience with backend tools - the key experience I lacked was creating a frontend. Therefore, I spent a few days in November/December musing over front-end frameworks such as ReactJS (Side tangent here: I actually got an introduction to ReactJS earlier at [MIT's ESP](https://esp.mit.edu/learn/index.html) program. I would highly recommend middle and high school students to explore MIT's ESP courses with a friend or two for fun). While exploring front-end, I started to wonder what frontend frameworks other simple websites used. What better website than Battlecode itself?
	
That's when I started scrolling through the source of the website. It was then I stumbled across a particularly interesting comment:

![BattlecodeFPS](writeup-images/BattlecodeFPS.png)


Battlecode was going to be an first person shooter o.0

(By the way, the website uses Angular)
Anyways, when the competition rolled around, in turns out it was not any sort of first person shooter. So whatever dev that left that comment trolled us. As for the battlestation, due to the college application process, I never got around to finishing the battlestation.

### Sprint Tournament - Initial Infrastructure

Armed with our experience from previous years, we knew that we could not compete against other people in theorycrafting based off the specs. Therefore, we took an approach similar to what we learned from last year: Building infrastructure. Thankfully, we did not have to go to the extent of wrapping their entire API before starting our actual strategies.

Our first big infrastructural decision was deciding what language to use. Battlecode 2019's engine is based off Javascript and transpilation into Javascript. Although none of our team members had any sort of experience with building a large project in Javascript, we decided we did not want to deal with the disadvantages of using transpiled Java or Python:

* Debugging would be a pain - One would have to read transpiled Javascript
    * Eventually, we did figure out line numbers do correspond with compiled_bot.js, which was very useful because the compiled version closely matched when using pure javascript.
* Not something we could foresee, but jsweet's transpiler online service went down in the middle of the competition.
* I wanted to learn javascript anyways

Otherwise, there are two other notable pieces of infrastructure we built during our first week.

* WrappedController - robot_map, true_map, map
    * Original purpose of keeping track of castles and churches for deposit locations of pilgrims
    * Treated a unit staying in the same location for 2 turns as "impassable terrain"
    * Transposing (because y, x is confusing for me :S)
        * It was so confusing - had a very confusing bug where it seemed like one of the maps was transposed
            * Turns out we were transposing every turn because the maps do not get reset every turn (they do not change from the start)
* [Dijkstras](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) (and soon after [BFS](https://en.wikipedia.org/wiki/Breadth-first_search)) - stopCondition (and soon after ignoreCondition)
    * PriorityQueue implementation (Heap)
        * Used Binary Heap
    * We did not time out because most, if not all, stopped searching early when they found what they wanted
        * Includes finding church location
        * Finding path towards enemy castle
        * Finding path to and from resources

[Editing in Progress]

### Sprint Tournament - Strategy & Macro Game

Castle Centralization

* Everything is centralized on one castle (referred to as the "leader castle")
* Pilgrims are assigned to resource tiles by the leader castle
* Defenders (which are only prophets at this stage) are assigned to resource tiles by the leader castle

[TODO]

Communication System

Battlecode 2019's communication was particularly restrictive. One has to note that the only free communication was "castle talk." This castlThe only free communication was the castle talk - and it could only go one way. Using only castle talk would be virtually impossible to coordinate units and create a (unless you use a substantial amount of emergent behavior)

However, to coordinate more units, we need to figure out some form of two way communication. This requirement leads to the only other form of communication: signalling. Unfortunately, transmitting over long distances takes a tremendous amount of fuel (proportional to r^2 where r is the distance). However, we quickly realized that a short transmission to an adjacent tile (r = 1, r = 2) would only require a maximum of 4 fuel. We took advantage of this by always sending a signal when we build a new unit. Due to build restrictions, new units are always adjacent to the unit that built them. With castle centralization, it is unnecessary to waste fuel to signal back, because we can easily queue up the free castle talks to communicate the other way.

### Sprint Tournament - Reflection - Why did we scrap (majorify of) this plan?

[TODO]

### Seeding/Qualifiers/Finals Strategy

Lattice prophets

Sparse vs Dense

Distributing the lattice

### Seeding Tournament - Castle Timeouts

ChurchLocationFinder
Prioritize those that are near the middle (?)

### Seeding/Qualifiers

### Seeding/Qualifiers/Finals Strategy - Communication (again)

[TODO]

Identification system

One really only has to identify as a unit type once - then one can use a map that maps id to unit type
Did not get around to implementing this for the qualifiers or finals

[TODO]

### Qualifiers

Church Laser
Crusader Endgame Spam

### High School Bracket

### Final tournament

* Emergent Behavior

https://www.twitch.tv/mitbattlecode/clip/IntelligentAnnoyingAsteriskKlappa

* Our second matchup vs Justice Of The War

https://www.twitch.tv/mitbattlecode/clip/GoldenFrozenAsparagusYee

### Conclusion

[TODO]

```
Final line count:
    50 Bfs.js
   657 CastleBot.js
   348 ChurchBot.js
   195 ChurchLocationFinder.js
   331 CrusaderBot.js
    59 Dijkstras.js
   157 LatticeProphetBot.js
    92 Library.js
   185 PilgrimBot.js
    18 PreacherBot.js (unused)
    70 PriorityQueue.js
   197 ProphetBot.js (unused)
    83 robot.js
    80 UnitsTracker.js
   335 Util.js
    93 WrappedController.js
  2950 total
```
