---
title: "How cooking taught me lab skills"
summary: "Chopsticks, garlic sauce, and espresso as hidden lessons in precision and observation."
lang: en
date: 2026-10-05
slug: how-cooking-taught-me-lab-skills
status: published
layout: existing
lead: false
page_title: "How Cooking Taught Me Lab Skills"
---

In one of my first meetings with my supervisor after joining his research group, we were talking about our lab skills, especially handling solar cell glass substrates with tweezers. He told me something I didn't expect: "Learn to cook. It'll help you in the lab". I thought he was joking, or trying to ease my first try nerves. But he was serious. He added: "Even your grip on the tweezers will get better if you eat with chopsticks".

I laughed at the time, but I bought the chopsticks. (If you're reading this: I bought a lot of them to practice with :) )

The truth is, I was already cooking before he said that, but I never thought of cooking as training for the lab. I cooked because I needed to survive. Sometimes I'd notice things in the kitchen without really paying attention to them. After that conversation, I started seeing them differently: everything I did in the lab was already there in the kitchen. What I didn't know yet was that making that connection is itself the skill. This article is my attempt to understand what I actually learned, and how the kitchen helped me shaping the skills I needed in the lab.

One of the lab skills that looks simple but isn't: handling the small glass pieces that solar cells are coated on with tweezers. They're tiny, 2 centimeters and sometimes just 1. This glass isn't cheap either; it costs about ten times as much as glass slides. If you drop one mid-experiment, you don't just lose the piece, you can lose hours of work. At first I dropped five out of every ten pieces. And don't get me started on how careful you have to be when spin coat the perovskite; right after that, I have to carry the glass to three different stages, fast, all within a minute and a half. Oh God, it was a nightmare!

The problem isn't the tweezers. It's the hand; a hand that hasn't yet learned to squeeze just enough, no more and no less, while keeping the glass steady. (And no, you can never handle it with your hand! I know what you're thinking!)

So I tried chopsticks. At first it was a disaster: the noodles slipped away, food kept escaping, and I nearly threw them out and went back to a fork. But after a few weeks, my hand started learning something different; that force isn't always the answer, and that the way you hold something is what solves the problem. I went back to the lab delighted, and sure enough, I could handle the glass. Now only one piece in twenty falls, now I could probably run in the lab holding glass in tweezers without dropping it, if university safety rules allowed it!

My supervisor was right. Not because chopsticks taught me a specific technique, but because they gave my hand a new sensitivity and a new skill.

It didn't stop there. I started cooking more, to pick up more skills that help me in the lab. Years ago, I used to make toum, the garlic sauce served with shawarma, the way everyone does; oil, egg white, garlic, and a blender. It always turned out well, but I never understood why.

Then I asked myself: why does toum turn creamy when everything I put in was liquid before blending? What changes inside it while it's being whipped? Wait, I think I know this one! It's an emulsion. Oil and water don't normally mix, because water molecules are polar and oil molecules aren't, so they aren't attracted to each other. But egg white contains molecules called emulsifiers, which sit at the boundary between oil and water and keep the two from separating. When I blend fast, I break the oil into very tiny droplets suspended in the water, and the egg molecules hold them in place. The result is a creamy texture and a delicious taste. Yes: an emulsion.

That moment of connection mattered to me, not because I started making better toum, but because I realized the kitchen is full of hidden physical chemistry. And if I can learn to see it there, I can see it anywhere.

```html
<div class="ibox">
      <div class="ibox-title">How an emulsion forms</div>
      <p class="ibox-caption">Emulsifier molecules put their tails in the oil and their heads in the water, which keeps the droplets stable</p>
      <svg id="emulsion-svg" viewBox="0 0 340 200" width="340" height="200"></svg>
      <div id="emulsion-info" class="info-box">Before whisking: the oil and water sit apart and don't mix. The egg molecules are scattered at random.</div>
    </div>
```

Has the kitchen stopped surprising me? Of course not. I'm a coffee addicted, and I have espresso machine, and I started watching videos to learn how to pull a good espresso that actually improves my mood. In one of them, the expert said: "You have to tamp the grounds evenly and leave no gaps, because the water finds the shortest path, rushes through them, and doesn't extract the flavor properly".

I stopped. "Leave no gaps".

I knew that sentence! In the lab, when I was preparing the ceramic Li₇La₃Zr₂O₁₂, I used a hydraulic press to compact the ceramic powder and reduce its porosity before sintering it (heating it until the grains fuse together). Pores weaken the material and hold back its properties, whether that's conducting electricity or standing up to mechanical stress. Exactly the same principle; a gap in the espresso powder means an easy shortcut for the water; a pore in the ceramic can cause problems with how it performs.

```html
<div class="ibox">
      <div class="ibox-title">How porosity affects the flow of water</div>
      <p class="ibox-caption">Pick one of the two modes to see how water behaves with loose or tightly packed grains</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap;">
        <button class="tab-btn active" onclick="setPorosity('loose',this)">Loose grains = high porosity</button>
        <button class="tab-btn" onclick="setPorosity('dense',this)">Packed grains = low porosity</button>
      </div>
      <svg id="porosity-svg" viewBox="0 0 340 220" width="340" height="220" style="display:block;margin:0 auto;max-width:100%;"></svg>
      <div id="porosity-info" class="info-box">Loose grains: the gaps are large, so the water finds short paths and rushes through without full extraction. In a ceramic, this weakens the material and makes it brittle.</div>
    </div>
```

And I haven't even mentioned grind size, dose, water temperature, and everything else that affects extraction, because it's exactly what we do in the lab. Only, since we're introverts who love inventing our own vocabulary, in the lab we call them parameters; in the kitchen we call them a recipe. Same principle, different place and vocabulary. That's what I was starting to understand.

Speaking of parameters; when you bake a cake or a French loaf, twenty grams of flour means something completely different from twenty-five. The cake that doesn't rise, the bread that's raw in the middle, the dough that sticks to everything; these are mistakes in measuring the recipe, the parameters. In fact, the kitchen has lots of variables; Some we can control and some we can't, and that's exactly what happens in the lab. The ones we can't control can affect the result, but they don't make it impossible to reproduce.

Precision in the lab works the same way. When I prepare a solution at a specific concentration, one extra gram changes the whole result. And the difference between a researcher who gets reproducible results and one who doesn't often comes down to this small kind of attention. Precise measurement gives a predictable, repeatable result, whether in a bread recipe or a lab solution. (I wish people who make cooking videos would stop using "a spoonful" as a unit of measurement. As a lab researcher, it drives me crazy!)

```html
<div class="ibox">
      <div class="ibox-title">Why precise measurement matters</div>
      <p class="ibox-caption">Move the slider to see how measurement error affects the final result</p>
      <svg id="precision-svg" viewBox="0 0 340 160" width="340" height="160"></svg>
      <div class="slider-wrap">
        <span class="slider-label">Measurement error:</span>
        <input type="range" id="error-slider" min="0" max="40" value="0" oninput="updatePrecision(this.value)">
        <span id="precision-status" style="font-size:13px;color:#6B6A63;">Perfect precision, no measurement error</span>
      </div>
      <div id="precision-info" class="info-box">Precise measurement gives a predictable, repeatable result, whether in a bread recipe or a lab solution.</div>
    </div>
```

I'm not saying cooking teaches you chemistry or physics. Cooking doesn't replace the lab. But it does something else; it keeps you in a constant state of observation. It makes you ask: why? What's happening right now? What changed? Those questions are the heart of lab work.

The difference between a researcher who runs experiments and a researcher who understands what's happening in them often lies in the habit of asking, not in knowledge alone. My supervisor wanted to tell me that from the start. But he just chose a simpler way to say it: learn to cook.

```html
<p style="margin:0;font-size:14px;color:#6B6A63;font-family:'IBM Plex Mono',monospace;">P.S. The first dish I ever cooked was chicken with jam. And once I bought lung instead of meat and made kabsa out of it. But isn't that what we do in the lab? We fail at experiments, then fix our mistakes :)</p>
<p style="margin:0;font-size:14px;color:#6B6A63;font-family:'IBM Plex Mono',monospace;">Note: AI was used to build the interactive diagrams and to help with language editing.</p>
```
