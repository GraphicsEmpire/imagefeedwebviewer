/**
 * Created by pouryas on 4/18/2016.
 */
function Carousel(parentwidth, parentheight) {
    //create a scene, a camera and a renderer
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 250, 1400);

    // LIGHTS
    this.dirLight = new THREE.DirectionalLight( 0xffffff, 0.125 );
    this.dirLight.position.set( 0, 0, 1 ).normalize();
    this.scene.add( this.dirLight );

    this.pointLight = new THREE.PointLight( 0xffffff, 1.5 );
    this.pointLight.position.set( 0, 100, 90 );
    this.scene.add( this.pointLight );

    //camera
    this.camera = new THREE.PerspectiveCamera( 60.0, parentwidth / parentheight, 0.1, 1000);
    this.camera.position.z  = 5;

    //renderer
    this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    this.renderer.setClearColor(this.scene.fog.color);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize( parentwidth, parentheight );
    document.body.appendChild( this.renderer.domElement );
}

//init panels scene
Carousel.prototype.init_panels = function() {

    //counts
    this.nx_sides = 10;
    this.nx_panels = this.nx_sides * 2 + 1;

    //wait area proportion
    this.t_wait_area = 0.3;
    this.stops = new Array(this.nx_panels);
    this.labels = new Array(this.nx_panels);
    this.active = new Array(this.nx_panels);

    //scale
    this.scale_side_panel = 4.5;
    this.scale_center_panel = 16.0;

    //create stops
    for(var i=0; i < this.nx_panels; i++) {
        if(i < this.nx_sides) {
            this.stops[i] = (i / (this.nx_sides - 1)) * this.t_wait_area;
            this.stops[this.nx_panels - i - 1] = 1.0 - this.stops[i];
        }
        else if(i == this.nx_sides){
            this.stops[i] = 0.5;
        }

        this.labels[i] = "";
    }

    for(var i=0; i < this.nx_panels; i++)
        console.log("stops[" + i + "] = " + this.stops[i]);

    //add curve
    this.curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3( -2, 0, 2 ),
        new THREE.Vector3( -0.5, 0.5, 0 ),
        new THREE.Vector3( 0.5, 0.5, 0 ),
        new THREE.Vector3( 2, 0, 2 )
    );


    //curved path
    var curve_geom = new THREE.Geometry();
    curve_geom.vertices = this.curve.getPoints( 50 );
    var curve_mtrl = new THREE.LineBasicMaterial( { color : 0xff0000, opacity: 0.2, transparent: true } );
    var curveObject = new THREE.Line( curve_geom, curve_mtrl );
    this.scene.add(curveObject);

    //create panels
    this.panels = new THREE.Object3D();
    this.panels.updateMatrixWorld();

    for(var i=0; i < this.nx_panels; i++) {
        var pt = this.curve.getPointAt(this.stops[i]);
        this.active[i] = this.create_panel_colored(pt,
            this.compute_panel_scale(i),
            this.compute_panel_rotation(i));

        this.panels.add(this.active[i]);
    }

    this.attached = true;
    this.scene.add(this.panels);
};

//compute scale
Carousel.prototype.compute_panel_scale = function (index) {
    var v = new THREE.Vector3();
    if(index < 0 || index >= this.nx_panels) {
        console.error("Invalid panel index" + index);
        return v;
    }

    if(index == this.nx_sides)
        v.set(this.scale_center_panel, this.scale_center_panel, 0.2);
    else
        v.set(this.scale_side_panel, this.scale_side_panel, 0.2);
    return v;
};

//compute orientation
Carousel.prototype.compute_panel_rotation = function(index) {
    var quat = new THREE.Quaternion();
    if(index < 0 || index >= this.nx_panels) {
        console.error("Invalid panel index" + index);
        return quat;
    }

    //if this is the center panel
    if(index == this.nx_sides) {
        quat.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), 0.0 );
        return quat;
    }

    var tangent = this.curve.getTangentAt(this.stops[index]).normalize();
    var axis = new THREE.Vector3();
    var up = undefined;

    if(index <= this.nx_sides)
        up = new THREE.Vector3(0, 0, -1);
    else
        up = new THREE.Vector3(0, 0, 1);

    axis.crossVectors(up, tangent).normalize();
    if(axis.length() < 0.01) {
        console.log("AXIS is degenerate! i = " + i);
    }

    //amount of rotation needed
    var radians = Math.acos( up.dot(tangent) );
    quat.setFromAxisAngle( axis, radians);

    return quat;
};

//create colored panel
Carousel.prototype.create_panel_colored = function(pos, scale, quat) {
    var geometry = new THREE.PlaneGeometry(0.1, 0.1, 1);
    geometry.computeFaceNormals();

    //select a random color for panel
    var cindex = getRandomInt(0, colorbrewer.Paired[7].length);
    var color = colorbrewer.Paired[7][cindex];

    var mtrl = new THREE.MeshBasicMaterial( { color: color, side: THREE.DoubleSide });
    var panel = new THREE.Mesh(geometry, mtrl);
    panel.position.x = pos.x;
    panel.position.y = pos.y;
    panel.position.z = pos.z;
    panel.scale.x = scale.x;
    panel.scale.y = scale.y;
    panel.scale.z = scale.z;
    panel.setRotationFromQuaternion(quat);

    return panel;
};

//remove last panel
Carousel.prototype.remove_last_panel = function () {
    if(this.active.length == 0) {
        console.error("there are 0 items in the active container");
        return false;
    }

    //remove last child
    var index = this.active.length - 1;
    this.panels.remove(this.active[index]);
    this.active.splice(index, 1);

    return true;
};

//detach all
/*
Carousel.prototype.detach_all = function () {
    if(! this.attached )
        return false;

    for(var i =0; i < this.active.length; i++)
        THREE.SceneUtils.detach(this.active[i], this.panels, this.scene);

    this.attached = false;

    return true;
};

//attach all
Carousel.prototype.attach_all = function () {
    if(this.attached )
        return false;

    //this.panels.updateMatrixWorld();
    for(var i =0; i < this.active.length; i++)
        THREE.SceneUtils.attach(this.active[i], this.scene, this.panels);

    this.attached = true;

    return true;
};
*/


//add a new panel
Carousel.prototype.add_new_panel = function(frame_uri) {

    if(frame_uri == undefined || frame_uri == "")
        return false;

    //detach all
    //this.detach_all();

    for(var i=0; i < this.active.length-1; i++) {
        var panel = this.active[i];

        //orientation
        var qm = new THREE.Quaternion();
        var q1 = new THREE.Quaternion().copy(panel.quaternion);
        var q2 = this.compute_panel_rotation(i + 1);

        var sm = new THREE.Vector3();
        var s1 = panel.scale;
        var s2 = this.compute_panel_scale(i+1);

        var pm = new THREE.Vector3();
        var p1 = panel.position;
        var p2 = this.curve.getPointAt(this.stops[i + 1]);

        //rotation
        panel.setRotationFromQuaternion(q2);

        //position
        panel.position.x = p2.x;
        panel.position.y = p2.y;
        panel.position.z = p2.z;

        //scale
        panel.scale.x = s2.x;
        panel.scale.y = s2.y;
        panel.scale.z = s2.z;
    }

    //remove last
    //console.log("Active panels count = " + this.active.length);
    if(this.active.length == this.nx_panels)
        this.remove_last_panel();
    //console.log("Active panels count = " + this.active.length);


    //instance
    var instance = this;

    //load texture
    var texloader = new THREE.TextureLoader();
    texloader.crossOrigin = '';

    // load a resource
    texloader.load(
        // resource URL
        frame_uri,
        // Function when resource is loaded
        function (texture) {
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;

            //plane
            var mtrl = new THREE.MeshBasicMaterial({map: texture, overdraw: true});
            var geometry = new THREE.PlaneGeometry(0.1, 0.1, 1);
            geometry.computeFaceNormals();

            //pos
            var pos = instance.curve.getPointAt(instance.stops[0]);
            var scale = instance.compute_panel_scale(0);

            //panel
            var panel = new THREE.Mesh(geometry, mtrl);
            panel.position.x = pos.x;
            panel.position.y = pos.y;
            panel.position.z = pos.z;
            panel.scale.x = scale.x;
            panel.scale.y = scale.y;
            panel.scale.z = scale.z;
            panel.setRotationFromQuaternion(instance.compute_panel_rotation(0));

            //remove last panels till we get to the correct count
            while(instance.active.length > instance.nx_panels - 1)
                instance.remove_last_panel();
            var count = instance.active.unshift(panel);
            //console.log("added new panel. count = " + count);

            instance.panels.add(panel);

            render();

        },
        // Function called when download progresses
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Function called when download errors
        function (xhr) {
            console.log('An error happened');
        }
    );
    return true;
};

//render func
Carousel.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
};

//resize func
Carousel.prototype.resize = function (parentwidth, parentheight) {
    this.camera.aspect = parentwidth/parentheight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parentwidth, parentheight);
    render();
};


// @return {integer} a random int between min and max
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}