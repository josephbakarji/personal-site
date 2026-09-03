# Music in Motion

*We're excited to announce that the Music Intelligence Lab at AUB, together with biomechanics and movement expert Olivier Chiniara as co-grantee, has been awarded a two-year Creative Labs grant (€65,000) for a project called Music in Motion. The grant is part of Ecologies of Culture (EoC), a four-year program co-funded by the European Union and led by the Arab Fund for Arts and Culture (AFAC), in partnership with Oxfam, Echos Electrik, and Megaphone. The project is co-led with dancer and chemical engineer Elsa Maalouf.*

## Summary

For millennia, music and dance have evolved next to each other as separate but intertwined art forms. Musicians create sound, dancers respond to it, and the relationship is mostly one-way. Music in Motion is our attempt to challenge that separation by making movement itself a musical instrument. Through wearable sensors, video pose estimation, and machine learning models that discover natural correspondences between motion and sound, we want to enable performers to make music directly through their bodies, turning them into both instrument and performer.

Three motivations drive the project. 

First, while generative AI models are disrupting traditional music-making processes, they also offer new opportunities for creative expression and collaboration. A partial solution would be to find ways to put human back in the loop of the creative process, by designing interfaces that make the interaction with the generative algorithms intuitive, and ultimately instrument-like.

Second, Music creation can be more accessible with a broader spectrum of learning curves. This could start by reforming music education, and accessibility to simple instruments. But it can also be made accessible with anyone who has a body and a camera. 

Third, the social well-being angle. Contemporary life pulls people out of their bodies (screens, symbolic work, AI automating cognitive tasks) at real cost to well-being and social cohesion. Technology can serve embodiment rather than extract from it; but it needs to be designed to do so on purpose. 


## A starting point 

The clearest starting point we have is the [Musical Flow Rope](../projects/#proj-musical-flow-rope): a weighted rope, spun with the whole body, sensored at the handles, streaming motion into a live pipeline that discovers a small movement vocabulary and turns each cycle into music through a DAW. The rope is a good first instrument because the object constrains body movement: those typically have a known limited vocabulary (such as overhand, underhand, matadors, etc.). The first principal component shared across dance and music is rhythm; both driven by the force of gravity. An example application is when chords change on the turn of each cycle, and timbre follows the energy of the motion. The physics of the object does most of the temporal work.

Music in Motion asks what happens when the constraint is removed; or more accurately when it is generalized to the entire space of free human movement. In dance, the movement space is unbounded, and the interesting work is figuring out which subset of that space we want to make musical, and how we hand that subset to a performer without turning them into a puppet of the mapping. 

## The curse of programmability

Once you decide movement is your interface, the core design problem is what I is called the curse of programmability (Perry). Digital instruments can have many more degrees of freedom than acoustic ones: any sensor, any feature, any mapping, any sound, etc. This could be both exciting and paralyzing at the same time. Traditional instruments give the performer decades to explore a small, deep interface. Digital instruments give them a lifetime to choose which interface to explore in the first place.

The way through, I think, is not to escape the curse but to accept it as a design responsibility. Choosing the movements, the sounds, and the mapping between them is itself an art. In this perspective, an instrument is a set of design choices, and the practice around it is what makes it playable rather than just triggerable. Whether generative AI, or even classical algorithmic composition techniques, can be used effectively to enable new forms of embodied experessions just as classical instruments do, remains to be seen. This is the hypothesis we're aim to prove, or ultimately disprove. The design principle is one where a good movement artist (one who moves well) is also one who plays good music. There is also a spectrum of control: a novice can walk in and play something meaningful while an expert can go deep in the details of the generated sounds.

Behind this is work we've already tested on rope flow, in which we collect data and find latent spaces that enable clustering and mapping. The team currently includes: 

- **Joseph Bakarji**, PI, on supervision, mechatronics, machine learning, music composition, and systems integration.
- **Elsa Maalouf**, co-PI, dancer and chemical engineer at AUB, on dance as a full-body interface and on the cultural side of the work.
- **Olivier Chiniara**, biomechanics and movement expert, on the vocabulary of the moving body (and the reason the rope-flow work exists in the first place).
- **Samir Shaker**, research assistant, on the live pipeline, app development.
- **Hélène Jabbour**, MS student in Mechanical Engineering, on mechatronics, working on a glove music instrument.

The team is also supported by collaborators, including: Joelle Khoury, on music composition and performance (as part of internal funding by the university), Nareg Karaoghlanian, on mechatronics and design, and a number of dancers and musicians we're inviting to be involved in the design and testing of the instruments, Khyam Allami, who has contributed to lab projects that might be used in the context of arabic music generation (the Shawwa algorithm, and DiArMaqAr), and a number of other students and collaborators in the lab and beyond.

## What success looks like

The purpose of this project is to make an art form, or at least to make it credible enough that other people want to make one with us. Specifically, we expect to develop a set of trained models we can release, an open-source repository, three to five public performances in a mix of academic, traditional, and contemporary venues, and a body of writing that lets other groups (in Lebanon, in the Arab region, and beyond it) pick up the work and build on it. If, a year after the grant ends, someone we have never met is building on top of any of this, we will call that a success.

If you are working on any part of this space (motion sensing, movement-to-sound mapping, dance practice, real-time music systems), or if you are a musician, dancer, or engineer who would like to be involved, please reach out at [joseph.bakarji@aub.edu.lb](mailto:joseph.bakarji@aub.edu.lb). This project only works if it becomes a scene.

---

<img src="../assets/logos/eu-cofunded.png" alt="Co-funded by the European Union" style="height:60px;margin-right:1.5rem;vertical-align:middle"><img src="../assets/logos/afac.png" alt="Arab Fund for Arts and Culture" style="height:60px;vertical-align:middle">

*This Project is implemented with the support of the Arab Fund for Arts and Culture – AFAC, in partnership with Oxfam, Echos Electrik, and Megaphone and co-funded by the European Union.*

*This document has been produced with the financial assistance of the European Union. The contents of this document are the sole responsibility of Music Intelligence Lab, American University of Beirut & Olivier Chiniara, and can under no circumstances be regarded as reflecting the position of the European Union.*
