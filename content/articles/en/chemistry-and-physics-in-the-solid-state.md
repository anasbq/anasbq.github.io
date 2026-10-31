---
title: "How do chemistry and physics meet in understanding solids?"
summary: "Why a chemist and a physicist read the same data differently, and how Roald Hoffmann bridged their two languages."
lang: en
date: 2026-09-01
slug: chemistry-and-physics-in-the-solid-state
status: published
layout: existing
lead: false
page_title: "How Chemistry and Physics Meet in Understanding Solids"
description: "Why do a chemist and a physicist read the same data in two different ways? A plain-language guide to atomic orbitals and energy bands, starting from Roald Hoffmann's famous 1987 paper."
feed_summary: "Why did my two supervisors read the same results in opposite ways? And how the chemist Roald Hoffmann brought the chemist's and the physicist's languages together."
feed_date: "2026-10-05T00:00:00Z"
---

At the end of last year, I sent my results to my two supervisors: one a physicist, the other a chemist. Both are experts in their fields, and both trained under the same solid-state scientist. What happened next shocked me. The physicist replied first: "The results are great and worth publishing." Then the chemist replied: "Hmm... I don't trust these results." I had run the experiment twice and gotten the same numbers both times. Most likely, his chemical intuition and experience were telling him not to trust them because of the chemical composition.

I sat staring at the two replies, completely confused. How could two experienced researchers read the same data and reach opposite conclusions? Was this a personal disagreement, or something deeper?

Then I came across a paper published in 1987 by the Nobel Prize-winning chemist Roald Hoffmann, titled "How Chemistry and Physics Meet in the Solid State." And it clicked: what I'd experienced with my supervisors wasn't an exception. It's a feature that has been rooted in materials science, and in solid-state science especially, for decades.

Hoffmann traces the divide to three causes. First, chemists feel lost among the terms solid-state physicists use (energy bands, Bloch functions, wave vectors) and so they steer clear of them. Second, physicists don't appreciate the deep intuition chemists have for the nature of chemical bonds. Third, solid-state chemists themselves don't make enough effort to keep up with molecular chemistry, so the gap widens from the inside. So the gap isn't in the data; it's in the language. That's what this article tries to bridge.

First, we need to understand what a solid is. Try putting your hand on the table in front of you, or on a wall, or on a piece of metal if there's one nearby. That hard thing you're touching: why is it solid at all? Why doesn't your hand pass through it? The question sounds naive, but it's one of the deepest in science. Solids, like metals, stones, wood, glass, and walls, differ from liquids and gases in how their atoms are arranged. In a gas, the molecules are free and move fast. In a liquid, they tumble over one another. But in a solid, every atom is locked into a regular geometric network it can't leave.

<div class="ibox">
      <div class="ibox-title">The crystal lattice</div>
      <p class="ibox-caption">Press "Animate" to see how atoms vibrate in place without ever leaving their spot</p>
      <svg id="lattice-canvas" width="340" height="220" viewBox="0 0 340 220" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;"></svg>
      <div style="margin-top:10px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button onclick="toggleLatticeAnim()" id="anim-btn" style="background:#2F6F6A;color:#fff;border:none;border-radius:6px;padding:7px 18px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:14px;">▶ Animate</button>
        <button onclick="changeTemp(-1)" style="background:#E2DFDA;color:#6B6A63;border:1px solid #D6D2C5;border-radius:6px;padding:7px 14px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:14px;">❄ Cool</button>
        <button onclick="changeTemp(1)" style="background:#E2DFDA;color:#6B6A63;border:1px solid #D6D2C5;border-radius:6px;padding:7px 14px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:14px;">🔥 Heat</button>
      </div>
      <p id="temp-label" style="margin:8px 0 0;font-size:13px;color:#6B6A63;">Temperature: low (the atoms barely move)</p>
    </div>

This regular geometric arrangement is what we call a crystal. Most solids around us are crystalline: salt, ice, metals. A few, like glass, have no regular order; we call them amorphous solids. Every crystalline solid has its own characteristic geometry, and each geometry gives different properties. You may have studied this in high school or university, so none of it is new.

Let's go deeper. Before we talk about millions of atoms in a solid, let's start with the simplest element there is: hydrogen. One atom, one nucleus, one electron. But that single electron tells us everything. A chemist pictures the electron as a cloud of probability around the nucleus. That cloud isn't random; it has very specific shapes we call atomic orbitals. A physicist describes the same thing as a wave function, which gives the probability of finding the electron at every point in space. So the two languages describe the same thing. The 1s orbital is the solution of the Schrödinger equation for the lowest energy level: a symmetric sphere around the nucleus. The 2p orbital is bigger and more complex, with two lobes like a dumbbell (if you go to the gym, you know the shape).

<div class="ibox">
      <div class="ibox-title">The atomic orbitals of hydrogen</div>
      <p class="ibox-caption">Pick an orbital to see its shape and energy: this is "where" the electron lives around the nucleus</p>
      <div class="tab-row">
        <button class="tab-btn active" onclick="selectOrbital('1s',this)">1s</button>
        <button class="tab-btn" onclick="selectOrbital('2s',this)">2s</button>
        <button class="tab-btn" onclick="selectOrbital('2px',this)">2p<sub>x</sub></button>
        <button class="tab-btn" onclick="selectOrbital('2py',this)">2p<sub>y</sub></button>
        <button class="tab-btn" onclick="selectOrbital('3d',this)">3d<sub>z²</sub></button>
      </div>
      <svg id="orbital-canvas" width="340" height="260" viewBox="0 0 340 260" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;"></svg>
      <div id="orbital-info" class="info-box">
       1s: the first energy level, with the lowest energy and the most stable. It is a symmetric sphere around the nucleus, and the electron spends most of its time close to the nucleus.
      </div>
    </div>

Each orbital has a specific energy. An electron in 1s has less energy than one in 2s, which in turn has less than one in 3d, and the lower the energy, the more stable the orbital. This staircase of energies is the key to understanding what happens when we bring hundreds of atoms together.

So what actually happens when two atoms get close? Their orbitals overlap, and this is where the chemist's and the physicist's descriptions start to differ, even though they describe the same thing. The chemist says the overlap is either constructive, when the two waves line up and form a strong, stable bond, or destructive, when they oppose each other and the bond falls apart. The physicist describes the same thing in the language of waves: amplification or cancellation.

The strange part is that the physicist and the chemist study the same solid but describe it in completely different ways, as if one were speaking English and the other Arabic about the same scene. The physicist asks: how do electrons flow? How fast does the wave travel inside the material? Which energy bands are allowed? Is the material a conductor or an insulator? The chemist asks: what kind of bonds hold the atoms together? How do the atomic orbitals overlap? Why is this compound stable? What does the electron look like around the atom? Both are wrong, and both are right! The physicist sees a solid as a sea of electrons. The chemist sees atoms bonded to other atoms. Each describes the same thing from a different angle.

Picture a single hydrogen atom with its 1s energy level. Now bring two hydrogen atoms close together. What happens? Their orbitals start to overlap, and when two orbitals overlap they don't merge into one. They split into two new orbitals: one lower in energy (bonding) and one higher (antibonding). This is the core idea behind the chemical bond, and it's where the bonds we learned about in school come from: metallic, ionic, and covalent. (A side note: the familiar picture of atoms in a covalent bond "sharing" electrons is a simplification for teaching, not a literal description of what happens.) Now that we understand bonding, imagine adding a third atom, then a fourth, then a thousand. Each atom adds a new energy level. When there are enough atoms, those separate levels turn into something entirely new: a continuous energy band.

<div class="ibox">
      <div class="ibox-title">From separate levels to a continuous band</div>
      <p class="ibox-caption">Move the slider to add atoms and watch the levels turn into a band</p>
      <svg id="band-canvas" width="340" height="200" viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;"></svg>
      <div class="slider-wrap">
        <span class="slider-label">Number of neighboring atoms:</span>
        <input type="range" id="atom-slider" min="1" max="20" value="1" oninput="updateBand(this.value)">
        <span id="band-status" style="font-size:13px;color:#6B6A63;">One atom → one sharp energy level</span>
      </div>
    </div>

The chemist looks at this band and says, "Oh, that's the sum of all the chemical bonds between hundreds of atoms." The physicist looks at the same band and says, "Look, that's the range where electrons can move freely." Same phenomenon, two languages. To make sense of all these numbers and hundreds of bonded atoms, physicists and chemists developed special plots for reading energy bands in solids. The two best known are:

**Band structure:** shows how an electron's energy changes depending on the "direction" it moves through the crystal. (The horizontal axis, k, is the wave vector, which represents the direction of the electron-wave in the lattice.)

**Density of states (DOS):** shows how many states are available to electrons at each energy level.

The two plots are linked. Where an energy line is flat in the band structure (the energy changes slowly), you'll find a tall peak in the DOS. Where the line is steep, the DOS is low. Chemists tend to prefer the DOS because it connects directly to bonding interactions; physicists tend to prefer the band structure because it shows how electrons move.

<div class="ibox">
      <div class="ibox-title">Interactive band structure and DOS</div>
      <p class="ibox-caption">Pick a type of material and see how the bands change shape, and where the Fermi level sits</p>
      <div class="tab-row">
        <button class="tab-btn active" onclick="selectMaterial('metal',this)">Metal</button>
        <button class="tab-btn" onclick="selectMaterial('semiconductor',this)">Semiconductor</button>
        <button class="tab-btn" onclick="selectMaterial('insulator',this)">Insulator</button>
      </div>
      <div class="band-dos-wrap" style="margin-top:8px;">
        <div class="band-col">
          <svg id="bs-canvas" width="200" height="280" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;"></svg>
          <span class="col-label">Band Structure</span>
        </div>
        <div class="dos-col">
          <svg id="dos-canvas" width="160" height="280" viewBox="0 0 160 280" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;"></svg>
          <span class="col-label">Density of States (DOS)</span>
        </div>
      </div>
      <div id="material-info" class="info-box">
        In a metal, the Fermi level sits inside a band, so electrons are free to move. That's why metals conduct electricity.
      </div>
    </div>

The Fermi level, E~F~, is the dividing line. The states below it are filled with electrons and form what's called the valence band; on these plots it always sits on the negative side of the energy axis. The states above it are empty and form the conduction band, on the positive side. For a material to conduct electricity, an electron has to jump from the lower band to the upper one. That jump costs energy, and how much depends on the distance between the top of the valence band and the bottom of the conduction band: the band gap.

In metals, for example, there's no gap at all: the two bands overlap, the Fermi level sits in the middle of that overlap, and electrons move freely between them. That's why metals are good conductors. In insulators such as glass (SiO₂), the two bands are separated by a large gap, and electrons can't cross it because the distance is too great.

And semiconductors? They sit between insulators and conductors. Because the gap between the bands is small, an electron only needs a little energy to jump into the conduction band. Without that extra energy, the material behaves like an insulator. Silicon (Si) is the classic example.

By the way, you may have noticed that a physicist talks about the electrons at the very top of the filled states, just below the Fermi level, as the valence electrons. That's the same idea a chemist means by the highest occupied molecular orbital, or "HOMO." Once again, two languages describing the same point.

So what ties the two languages together? The answer lies in the mathematics, in one elegant idea: the Bloch function.

Here's what the Bloch function says: an electron in a solid still carries the shape of its original atomic orbital, but repeated across the whole lattice as a wave when it links up with other atoms. Picture two singers, each with their own melody and voice; each voice is an atomic orbital. What happens when they sing together? Their individual voices don't vanish; they weave together into one collective wave. That's exactly what the Bloch function describes.

<div class="ibox">
      <div class="ibox-title">From atomic orbital to Bloch wave</div>
      <p class="ibox-caption">Click the atoms one at a time to see their orbitals combine into a single wave</p>
      <svg id="bloch-canvas" width="360" height="200" viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;cursor:pointer;"></svg>
      <p id="bloch-label" style="margin:8px 0 0;font-size:14px;color:#6B6A63;">Click the atoms one at a time</p>
    </div>

So how did this gap between physicists and chemists open up? It's worth pausing on. It didn't come from nowhere, and it wasn't a personal feud or a rivalry between two fields. It formed because physics and chemistry developed independently over decades, and each built its own tools, language, and questions. In the 1950s and 60s, solid-state physicists were busy with the stunning success of band theory in explaining conductivity and magnetism. At the same time, chemists were absorbed in building molecular orbital theory and understanding chemical bonds with unprecedented precision.

Hoffmann points out in his paper that over-specialization is the inevitable price of any scientific progress. The deeper you go into a field, the more you build vocabulary and methods that let you talk fluently with colleagues, and the further they carry you from people working in neighboring fields. He adds that the problem got worse because solid-state chemists didn't take care to build bridges between their two worlds, so they ended up making groundbreaking materials without the tools to explain their properties. The result: two researchers studying the same material in the same lab, each missing what the other knows.

This is the core of Hoffmann's message. The chemist doesn't need to give up thinking in bonds and orbitals, and the physicist doesn't need to give up wave equations. Both describe the same reality from different angles. But each has something to learn from the other.

What the chemist needs: to learn how to understand and classify the properties of materials, not just make new ones and determine their structure. A chemist should be able to analyze the electronic structure of the compounds they make, rigorously, so they can understand how to tune and control those properties. That means learning the language of solid-state physics, specifically band theory.

What the physicist needs: to learn the chemist's language of bonds and orbitals. A physicist can calculate a band structure with great accuracy but often can't answer a simple question: why is this compound stable in the first place? Or why does this material absorb light at this particular wavelength? Those are a chemist's questions. So the physicist needs to engage with molecular chemistry and understand the chemist's intuition for reading bonds, because that intuition is what makes you doubt a result even when the numbers look right, exactly as my supervisor did.

After that experience with my supervisors, after reading Hoffmann, and after understanding why each of them responded the way they did, something changed in how I read scientific papers and even how I look at my own results. I pay more attention now, and I ask: does this result make sense chemically? Does it fit the nature of the bonds in this compound? Is chemical intuition saying the same thing as the numbers, or is there a contradiction worth checking? Chemical intuition is a real analytical tool, built on dozens of papers and thousands of experiments. But it stays incomplete until it's tied to the physical properties of a material that we can actually measure.

## Sources

- Hoffmann, R. (1987). How Chemistry and Physics Meet in the Solid State. *Angewandte Chemie International Edition in English*, 26(9), 846–878. [doi.org/10.1002/anie.198708461](https://doi.org/10.1002/anie.198708461)

<p style="margin:0;font-size:14px;color:#6B6A63;font-family:'IBM Plex Mono',monospace;">Note: AI was used to build the interactive diagrams and to help with language editing.</p>
