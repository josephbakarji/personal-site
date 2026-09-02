# Music in Motion

*A one-year project on unifying music and dance under movement, funded by the Arab Fund for Arts and Culture (AFAC).*

## What we just got funded to do

We just received a grant from the Arab Fund for Arts and Culture to run a one-year project called Music in Motion. The premise is easy to state and hard to build: playing an instrument is a form of movement, and reacting to music is another form of movement, and these two arts have grown up next to each other without ever quite merging. Music in Motion is an attempt to make that merge concrete, by treating movement itself as the shared medium, and by designing systems that map bodies to sound without pretending either side is a stand-in for the other.

## From the rope outward

The clearest starting point I have is the [Musical Flow Rope](../projects/#proj-musical-flow-rope). A weighted rope, spun with the whole body, sensored at the handles, streams motion into a live pipeline that classifies movement, quantizes it into a small vocabulary, and turns each cycle into music through a DAW. The rope is a good first instrument because the object constrains the body: there are only so many things you can do with a spinning rope, so the vocabulary a performer (or a machine) has to learn is bounded. Rhythm is provided by the swinging mass, chords change on the turn of each cycle, timbre follows the energy of the motion. The physics of the object does most of the temporal work for you.

Music in Motion asks what happens when the constraint is removed. Dance is the opposite pole: the movement space is unbounded, and the interesting work is figuring out which subset of that space we want to make musical, and how we hand that subset to a performer without turning them into a puppet of the mapping. The rope is what we already have. Dance is where we are going.

## The curse of programmability

The core design problem, once you decide movement is your interface, is what I have taken to calling the curse of programmability. Digital instruments give you many more degrees of freedom than acoustic ones: any sensor, any feature, any mapping, any sound. That is exhilarating and paralyzing at the same time. Traditional instruments give the performer decades to explore a small, deep interface. Digital instruments give them a lifetime to choose which interface to explore in the first place.

The way through, I think, is not to escape the curse but to accept it as a design responsibility. Choosing the movements, choosing the sounds, and choosing the mapping between them is the art. The instrument is not a device, it is a set of design choices, and the practice around it is what makes it playable rather than merely triggerable.

## Team

Music in Motion is a small collective and each person is here because they carry an angle I do not.

- **Joelle Khoury**, composer and pianist, on musical direction and instrument voicing.
- **Olivier Chiniara**, rope-flow practitioner and movement artist, on the vocabulary of the moving body.
- **Elsa Maalouf**, from AUB Chemical Engineering and a dancer, on dance as a full-body interface.
- **Samir Shaker**, developer and research assistant, on the live pipeline and hardware.
- **Hélène Jabbour**, MS student in Mechanical Engineering, on mechatronics and interface builds.
- **Nareg Karaoghlanian**, Research Associate at AUB, on the sound side and continuous instrument design.

I lead on the vision, the pipeline architecture, and the writing.

## What the year looks like

The next twelve months are organized as a series of increasingly public demonstrations, starting from a reliable rope demo and a paper about it, adding rhythm detection and synchronization, opening up richer sound generation on the DAW side, and ending with a full performance that puts moving bodies (roped and unroped) and generated music in the same room. Along the way we plan to invite other movers and musicians in, because a lot of the design questions only reveal themselves when a second person shows up with their own body and their own musical instincts.

The point is not to ship a product. The point is to make an art form, or at least to make it credible enough that other people want to make one with us. I do not care much about owning it. I care about it existing.

If you are working on any part of this space (motion sensing, movement-to-sound mapping, dance practice, real-time music systems), please reach out. This project only works if it becomes a scene.
