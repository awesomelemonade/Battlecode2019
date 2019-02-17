# 2950 lines of Javascript AI - An MIT Battlecode 2019 Writeup

### Intro - Why did I write this?

	It's that time of the year again! A month-long constant grind to achieve the invaluable experience of travelling to MIT and glorious fame of (owait there is prize money too ;o). For the past few years, I have participated in Battlecode, but I had never written any sort of writeup. It was only until Cixelyn (Cory Li, MIT 2012, @Cixelyn), a previous winner of battlecode (and also wrote a fascinating post mortem link here), protested that we should write more post mortems.

![Cixelyn1](writeup-images/Cixelyn1.png)

![Cixelyn2](writeup-images/Cixelyn2.png)

	Quite frankly, I simply did not have anything interesting to write about in previous years, and thus did not pursue any sort of writeup. However, this year, although we (spoilers) did not win, it certainly has been an adventurous journey in not only programming our bot, but also in socializing with the devs and other teams at the finals.

### Initial Preparation

	Coming into my third year of MIT Battlecode, I was motivated to make this year our best performance yet. One of my current philosophy in these competitions is to always strive for #1. Decisions should be made with the goal of reaching first place instead of the "I should cut my losses" mindset. In addition, it is important for me to pursue long term learning goals that pertain to the real world. As a high school student, I realized that it is not a time for me to make products or start a company and save the world from global warming or achieve world peace at this age. After all, there are over 7 billion people in the world and a great majority have more experience than I do. Certainly there are a significant number of people that are smarter in many areas than I am, so how would I be able to solve worldly problems as a measly high school student? Therefore, I sought to focus on education and learning tools and ideas that can prepare me to solve these problems for the future.

	I was preparing myself for the four-week grind over MIT's Independent Activities Period long before it actually started. One thing that I heard about was from last year's #1 team Orbitary Graph (Side note: I also talked to Standard Technology during the finals, and they also considered using something similar based off an open source project a previous battlecoder (bovard) had created: https://github.com/bovard/archon)). Orbitary Graph had a "battlestation" where they could have bots play other versions of their bots automagically. Rule based (handcoded non-machine-learning) bots often have many "magic values" used for heuristics. Having this battlestation can produce fast, convenient, and reliable results to assist in creating a more fluid feedback loop to help change constants. Unfortunately, even if I knew about bovard's archon project beforehand, it would not have been easily adaptable to the new Javascript stack used in Battlecode 2019.

	This does not mean I did not try to create this battlestation. I had reasonable experience with backend tools - the key experience I lacked was creating a frontend. Therefore, I spent a few days in November/December musing over front-end frameworks such as ReactJS (Side tangent here: I actually got an introduction to ReactJS earlier at MIT's Splash program. I would highly recommend middle and high school students to explore MIT's ESP courses with a friend or two for fun). While exploring front-end, I started to wonder what frameworks other simple websites used. What better website than Battlecode itself?
	
	That's when I started scrolling through the source of the website. It was then I stumbled across a particularly interesting comment:

![BattlecodeFPS](writeup-images/BattlecodeFPS.png)


Battlecode was going to be an first person shooter o.0

(By the way, the website uses Angular)
Anyways, when the competition rolled around, in turns out it was not any sort of first person shooter. So whatever dev that left that comment trolled us.


[Editing in progress...]

[TODO] I even wanted to implement trueskill similar to Halite's leaderboard. (In fact, I wanted to create this "BotArena [link to github]" since halite. However, these are huge ambitions that require a tremendous amount of time that I simply could not afford. [College apps]

### Sprint Tournament - Initial Infrastructure

### Conclusion


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
