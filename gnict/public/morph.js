function morph(emotion){
    const time = 1000;
    const sad_color = "#0073ff", fear_color = "#fbfff0", disgust_color = "#212121";

    const timeline0 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline0.add({
        targets: ".face",
        fill: [
            {value: emotion.face},
        ]        
    });

    const timeline1 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline1.add({
        targets: ".r_eye",
        d: [
            {value: emotion.r_eye},
        ]        
    });

    const timeline2 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline2.add({
        targets: ".l_eye",
        d: [
            {value: emotion.l_eye},
        ]        
    });

    const timeline3 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline3.add({
        targets: ".r_eyebrow",
        d: [
            {value: emotion.r_eyebrow},
        ]        
    });

    const timeline4 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline4.add({
        targets: ".l_eyebrow",
        d: [
            {value: emotion.l_eyebrow},
        ]        
    });

    var mouse_color = "";

    if(emotion.id == "anger"){
        mouse_color = "#000";
    }else{
        mouse_color = "#FF3D3D";
    }

    const timeline5 = anime.timeline({
        duration: time,
        easing: "easeOutExpo"
    });

    timeline5.add({
        targets: ".mouse",
        d: [
            {value: emotion.mouse},
        ],
        fill: [
            {value: mouse_color}
        ]      
    });

    const timeline6 = anime.timeline({
        duration: 300
    });

    timeline6.add({
        targets: ".option_sad1",
        d: [
            {value: emotion.option_sad1},
        ],
        keyframes: [
            { opacity:0 },
            { opacity:0 },
            { opacity:1 }
        ],
        fill: [
            {value: sad_color}
        ]      
    });

    const timeline7 = anime.timeline({
        duration: 300
    });

    timeline7.add({
        targets: ".option_sad2",
        d: [
            {value: emotion.option_sad2},
        ],
        keyframes: [
            { opacity:0 },
            { opacity:0 },
            { opacity:1 }
        ],
        fill: [
            {value: sad_color}
        ]      
    });

    const timeline8 = anime.timeline({
        duration: 500
    });

    timeline8.add({
        targets: ".option_fear1",
        d: [
            {value: emotion.option_fear1},
        ],
        keyframes: [
            { opacity:0 },
            { opacity:0 },
            { opacity:1 }
        ],
        fill: [
            {value: fear_color}
        ]      
    });

    const timeline9 = anime.timeline({
        duration: 500
    });

    timeline9.add({
        targets: ".option_fear2",
        d: [
            {value: emotion.option_fear2},
        ],
        keyframes: [
            { opacity:0 },
            { opacity:0 },
            { opacity:1 }
        ],
        fill: [
            {value: fear_color}
        ]      
    });

    const timeline10 = anime.timeline({
        duration: 500
    });

    timeline10.add({
        targets: ".option_disgust",
        d: [
            {value: emotion.option_disgust},
        ],
        keyframes: [
            { opacity:0 },
            { opacity:0 },
            { opacity:1 }
        ],
        fill: [
            {value: disgust_color}
        ]      
    });

}

export { morph };