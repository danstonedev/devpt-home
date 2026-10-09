import{Color as b,WebGLRenderTarget as k,UnsignedByteType as G,RGBAFormat as A,LinearFilter as R,SRGBColorSpace as P,NearestFilter as B,CanvasTexture as O,Mesh as I,ShaderMaterial as E,DoubleSide as W,Vector3 as g,Vector2 as F,Scene as L,OrthographicCamera as H,DataTexture as z,FloatType as Y,BufferGeometry as Q,Float32BufferAttribute as q,Sphere as Z,RawShaderMaterial as M,MathUtils as V,BufferAttribute as $}from"./three.module-d0yTp6cH.js";import{r as J,m as U,i as ee,c as te,a as y,b as re}from"./bodyChartDebug-uLSkTlB6.js";import{U as se}from"./index-DHbMzchT.js";import{P as w}from"./brushProfiles-C5nhaS3G.js";import"./IndependentShoulderLab-EJCSU4xb.js";import"./OrbitControls-C7-VOhYZ.js";import"./index-C0SPdC2I.js";import"./poseClickDeselect-MTEXV1mF.js";import"./painResponseLayer-D3xWRMYO.js";import"./independentShoulderRig-BpAOkUfa.js";const _=`
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    // Position the vertex at its UV coordinate (unwrap onto the render target)
    gl_Position = vec4(uv * 2.0 - 1.0, 0.5, 1.0);

    // Pass world-space position and normal to the fragment shader
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(normalMatrix * normal);
    vUv = uv;
  }
`,ae=`
  precision highp float;

  uniform vec3 uBrushFrom;
  uniform vec3 uBrushTo;
  uniform float uBrushRadius;
  uniform sampler2D uPrevMaskTexture;
  uniform vec2 uResolution;
  uniform vec3 uBrushNormalFrom;
  uniform vec3 uBrushNormalTo;
  uniform float uNormalCutoff;
  uniform float uSolidCore;
  uniform float uFeather;
  uniform float uFeatherWorld;
  uniform float uBrushOpacityMul;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vec3 segment = uBrushTo - uBrushFrom;
    float segmentLengthSq = dot(segment, segment);
    float segmentT = 0.0;
    vec3 closestPoint = uBrushFrom;
    if (segmentLengthSq > 0.0000001) {
      segmentT = clamp(dot(vWorldPos - uBrushFrom, segment) / segmentLengthSq, 0.0, 1.0);
      closestPoint = uBrushFrom + segment * segmentT;
    }

    float dist = distance(vWorldPos, closestPoint);
    float normalizedDist = dist / max(uBrushRadius, 0.0001);
    float outerEdge = min(1.0, clamp(uSolidCore, 0.0, 1.0) + max(uFeather, 0.0001));
    float feather = uFeatherWorld > 0.0
      ? clamp(uFeatherWorld / max(uBrushRadius, 0.0001), 0.0001, outerEdge)
      : max(uFeather, 0.0001);
    float solidCore = max(0.0, outerEdge - feather);
    float falloff = 1.0 - smoothstep(solidCore, outerEdge, normalizedDist);

    // Normal-based rejection: don't paint on back-facing surfaces
    vec3 brushNormal = normalize(mix(uBrushNormalFrom, uBrushNormalTo, segmentT));
    float normalDot = dot(normalize(vWorldNormal), brushNormal);
    float normalMask = smoothstep(uNormalCutoff - 0.1, uNormalCutoff + 0.1, normalDot);

    float coverage = falloff * normalMask;
    vec2 texCoord = gl_FragCoord.xy / uResolution;
    float prevCoverage = texture2D(uPrevMaskTexture, texCoord).r;
    float mask = max(prevCoverage, coverage * uBrushOpacityMul);
    gl_FragColor = vec4(mask, mask, mask, 1.0);
  }
`,ie=`
  precision highp float;

  uniform sampler2D uSegmentData;
  uniform sampler2D uPrevMaskTexture;
  uniform int uSegmentCount;
  uniform float uSegmentTexHeight;
  uniform float uNormalCutoff;
  uniform float uSolidCore;
  uniform float uFeather;
  uniform float uFeatherWorld;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vec3 worldNorm = normalize(vWorldNormal);
    float maxMask = texture2D(uPrevMaskTexture, vUv).r;

    for (int i = 0; i < 4096; i++) {
      if (i >= uSegmentCount) break;

      float row = (float(i) + 0.5) / uSegmentTexHeight;
      vec4 d0 = texture2D(uSegmentData, vec2(0.125, row));
      vec4 d1 = texture2D(uSegmentData, vec2(0.375, row));
      vec4 d2 = texture2D(uSegmentData, vec2(0.625, row));
      vec4 d3 = texture2D(uSegmentData, vec2(0.875, row));

      vec3 brushFrom = d0.xyz;
      vec3 brushTo = vec3(d0.w, d1.xy);
      vec3 nFrom = vec3(d1.zw, d2.x);
      vec3 nTo = d2.yzw;
      float radius = d3.x;
      float opacityMul = d3.y;

      vec3 seg = brushTo - brushFrom;
      float segLenSq = dot(seg, seg);
      float segT = 0.0;
      vec3 closest = brushFrom;
      if (segLenSq > 0.0000001) {
        segT = clamp(dot(vWorldPos - brushFrom, seg) / segLenSq, 0.0, 1.0);
        closest = brushFrom + seg * segT;
      }

      float dist = distance(vWorldPos, closest);
      float normDist = dist / max(radius, 0.0001);

      // Early skip: if the fragment is far from this segment, skip the rest
      if (normDist > 1.5) continue;

      float outerEdge = min(1.0, clamp(uSolidCore, 0.0, 1.0) + max(uFeather, 0.0001));
      float feather = uFeatherWorld > 0.0
        ? clamp(uFeatherWorld / max(radius, 0.0001), 0.0001, outerEdge)
        : max(uFeather, 0.0001);
      float solidCore = max(0.0, outerEdge - feather);
      float falloff = 1.0 - smoothstep(solidCore, outerEdge, normDist);

      vec3 brushNormal = normalize(mix(nFrom, nTo, segT));
      float normalDot = dot(worldNorm, brushNormal);
      float normalMask = smoothstep(uNormalCutoff - 0.1, uNormalCutoff + 0.1, normalDot);

      float coverage = falloff * normalMask * opacityMul;
      maxMask = max(maxMask, coverage);
    }

    gl_FragColor = vec4(maxMask, maxMask, maxMask, 1.0);
  }
`,oe=`
  precision highp float;

  uniform sampler2D uBaseTexture;
  uniform sampler2D uMaskTexture;
  uniform vec3 uBrushColor;
  uniform float uBrushOpacity;
  uniform int uIsErase;
  uniform int uReplacePaint;
  uniform vec3 uBaseColor;

  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(uBaseTexture, vUv);
    float mask = texture2D(uMaskTexture, vUv).r;
    float alpha = clamp(mask * uBrushOpacity, 0.0, 1.0);
    vec3 targetColor = uIsErase == 1 ? uBaseColor : uBrushColor;
    vec3 normalResult = alpha > 0.0 ? mix(base.rgb, targetColor, alpha) : base.rgb;
    vec3 result = normalResult;

    if (uReplacePaint == 1 && uIsErase == 0) {
      vec3 paintAxis = uBrushColor - uBaseColor;
      float denom = max(dot(paintAxis, paintAxis), 0.000001);
      float existingAlpha = clamp(dot(base.rgb - uBaseColor, paintAxis) / denom, 0.0, 1.0);
      vec3 projected = mix(uBaseColor, uBrushColor, existingAlpha);
      float samePaint = 1.0 - smoothstep(0.02, 0.08, distance(base.rgb, projected));
      float unionAlpha = max(existingAlpha, alpha);
      vec3 unionResult = mix(uBaseColor, uBrushColor, unionAlpha);
      result = mix(normalResult, unionResult, samePaint);
    }

    gl_FragColor = vec4(result, 1.0);
  }
`,S=`
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`,ne=`
  precision highp float;
  uniform sampler2D uTextureA;
  uniform sampler2D uTextureB;
  uniform sampler2D uTextureC;
  uniform vec3 uBaseColor;
  varying vec2 vUv;
  void main() {
    vec3 a = texture2D(uTextureA, vUv).rgb;
    vec3 b = texture2D(uTextureB, vUv).rgb;
    vec3 c = texture2D(uTextureC, vUv).rgb;
    vec3 summed = a + b + c - 2.0 * uBaseColor;
    gl_FragColor = vec4(clamp(summed, 0.0, 1.0), 1.0);
  }
`,le=`
  precision highp float;
  uniform sampler2D uTexturePre;
  uniform sampler2D uTexturePost;
  uniform vec3 uBaseColor;
  uniform vec3 uMarkColor;
  uniform vec3 uMoreColor;
  uniform vec3 uLessColor;
  /** Below this the change is not drawn at all — see the note on transparency. */
  uniform float uDeadZone;
  /** Delta magnitude that saturates the ramp. */
  uniform float uFullScale;
  /** Hatch period in texels, for the less-marked direction. */
  uniform float uHatchScale;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float recoverAlpha(vec3 texel) {
    vec3 span = uMarkColor - uBaseColor;
    float denom = max(dot(span, span), 1e-6);
    return clamp(dot(texel - uBaseColor, span) / denom, 0.0, 1.0);
  }

  void main() {
    float pre = recoverAlpha(texture2D(uTexturePre, vUv).rgb);
    float post = recoverAlpha(texture2D(uTexturePost, vUv).rgb);
    float delta = post - pre;
    float magnitude = abs(delta);

    if (magnitude < uDeadZone) {
      gl_FragColor = vec4(uBaseColor, 1.0);
      return;
    }

    float strength = clamp(magnitude / max(uFullScale, 1e-6), 0.0, 1.0);
    vec3 direction = delta > 0.0 ? uMoreColor : uLessColor;

    // Diagonal hatch on the less-marked side only. Redundant with hue by
    // design; it is what survives greyscale and colour-blindness.
    float hatch = 1.0;
    if (delta < 0.0) {
      vec2 px = vUv * uResolution;
      float stripe = fract((px.x + px.y) / max(uHatchScale, 1.0));
      hatch = stripe < 0.5 ? 1.0 : 0.35;
    }

    vec3 result = mix(uBaseColor, direction, strength * hatch);
    gl_FragColor = vec4(result, 1.0);
  }
`,he=`
  precision highp float;
  uniform sampler2D uTextureA;
  uniform sampler2D uTextureB;
  uniform float uMix;
  varying vec2 vUv;
  void main() {
    vec4 a = texture2D(uTextureA, vUv);
    vec4 b = texture2D(uTextureB, vUv);
    gl_FragColor = mix(a, b, uMix);
  }
`,ue=`
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uCoverageTexture;
  uniform vec2 uTexelSize;
  uniform vec3 uBaseColor;
  uniform float uThreshold;
  uniform float uStrength;

  varying vec2 vUv;

  bool isBase(vec3 color) {
    return distance(color, uBaseColor) < uThreshold;
  }

  void main() {
    vec4 center = texture2D(uTexture, vUv);
    float coverage = texture2D(uCoverageTexture, vUv).r;

    // Preserve real surface texels. Dilation is only for UV gutters outside
    // rasterized triangles, so brush silhouettes do not bloom on the body.
    if (coverage > 0.5) {
      gl_FragColor = center;
      return;
    }

    // If this pixel already has paint, keep it
    if (!isBase(center.rgb)) {
      gl_FragColor = center;
      return;
    }

    // Sample 8 neighbors — pick the closest non-base pixel
    vec3 best = center.rgb;
    float bestDist = 999.0;

    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) continue;
        vec2 offset = vec2(float(dx), float(dy)) * uTexelSize;
        vec3 sampleCol = texture2D(uTexture, vUv + offset).rgb;
        if (!isBase(sampleCol)) {
          float d = length(vec2(float(dx), float(dy)));
          if (d < bestDist) {
            bestDist = d;
            best = sampleCol;
          }
        }
      }
    }

    gl_FragColor = vec4(mix(center.rgb, best, clamp(uStrength, 0.0, 1.0)), 1.0);
  }
`,de=`
  precision highp float;
  uniform sampler2D uPrevMaskTexture;
  uniform sampler2D uUploadTexture;
  varying vec2 vUv;
  void main() {
    float mask = max(
      texture2D(uPrevMaskTexture, vUv).r,
      texture2D(uUploadTexture, vUv).r
    );
    gl_FragColor = vec4(mask, mask, mask, 1.0);
  }
`,ce=`
  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`,pe=`
  precision highp float;
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;function K(C,e){if(!C)return null;const r=Math.max(0,Math.min(e,Math.floor(C.x0))),t=Math.max(0,Math.min(e,Math.floor(C.y0))),s=Math.max(r,Math.min(e,Math.ceil(C.x1))),a=Math.max(t,Math.min(e,Math.ceil(C.y1)));return s>r&&a>t?{x0:r,y0:t,x1:s,y1:a}:null}const X=512,me=256,D=class D{constructor(e,r,t={}){this.activeStrokeGroup=null,this.uvMeshWorldBaked=!1,this.contentGeneration=0,this.lastDilatedGeneration=-1,this.dirty=!1,this.liveCompositePending=!1,this.disposed=!1,this.undoStack=[],this.redoStack=[],this.appliedMeshes=new Set,this.appliedMaterialStates=new Map,this.cpuReadbackDirty=!1,this.savedClearColor=new b,this.pendingSegments=[],this.maskUploadTextureCache=new Map,this.maxSegmentsPerBatch=Math.min(me,X),this.resolution=t.resolution??1024,this.baseColorStr=t.baseColor??"#edf1ee",this.baseColor=new b(this.baseColorStr),this.dilationPasses=t.dilationPasses??16,this.renderer=r,this.mesh=e;const s=this.resolution,a={minFilter:R,magFilter:R,format:A,type:G,depthBuffer:!1,stencilBuffer:!1};this.rtA=new k(s,s,a),this.rtB=new k(s,s,a),this.rtA.texture.colorSpace=P,this.rtB.texture.colorSpace=P;const i=typeof this.renderer.capabilities?.getMaxAnisotropy=="function"?this.renderer.capabilities.getMaxAnisotropy():1,o=Math.max(1,Math.min(16,i));this.rtA.texture.anisotropy=o,this.rtB.texture.anisotropy=o,this.readTarget=this.rtA,this.writeTarget=this.rtB,this.strokeMaskA=new k(s,s,a),this.strokeMaskB=new k(s,s,a),this.strokeMaskRead=this.strokeMaskA,this.strokeMaskWrite=this.strokeMaskB,this.strokeBaseTarget=new k(s,s,a),this.strokeBaseTarget.texture.colorSpace=P,this.coverageMaskTarget=new k(s,s,{minFilter:B,magFilter:B,format:A,type:G,depthBuffer:!1,stencilBuffer:!1}),this.clearRenderTarget(this.rtA),this.clearRenderTarget(this.rtB),this.clearMaskRenderTarget(this.strokeMaskA),this.clearMaskRenderTarget(this.strokeMaskB),this.clearRenderTarget(this.strokeBaseTarget),this.clearMaskRenderTarget(this.coverageMaskTarget),this.cpuCanvas=document.createElement("canvas"),this.cpuCanvas.width=s,this.cpuCanvas.height=s,this.cpuCtx=this.cpuCanvas.getContext("2d",{willReadFrequently:!0}),this.cpuCtx.fillStyle=this.baseColorStr,this.cpuCtx.fillRect(0,0,s,s),this.canvasTexture=new O(this.cpuCanvas),this.canvasTexture.colorSpace=P,this.canvasTexture.flipY=!0,this.canvasTexture.minFilter=R,this.canvasTexture.magFilter=R,this.canvasTexture.generateMipmaps=!1,this.canvasTexture.anisotropy=o,this.canvasTexture.needsUpdate=!0;let n;if(t.precomputedGeometry)n=t.precomputedGeometry.clone(),n.getAttribute("normal")||n.computeVertexNormals();else{const f=(t.allMeshes&&t.allMeshes.length>0?t.allMeshes:[e]).map(p=>this.createBrushGeometry(p));n=f.length>1?this.mergeBufferGeometries(f):f[0];for(const p of f)p!==n&&p.dispose()}this.uvMeshWorldBaked=!0,this.uvMesh=new I(n,void 0),this.uvMesh.matrixAutoUpdate=!1,this.uvMesh.frustumCulled=!1,this.brushMaterial=new E({vertexShader:_,fragmentShader:ae,uniforms:{uBrushFrom:{value:new g},uBrushTo:{value:new g},uBrushRadius:{value:.05},uPrevMaskTexture:{value:this.strokeMaskRead.texture},uResolution:{value:new F(s,s)},uBrushNormalFrom:{value:new g(0,0,1)},uBrushNormalTo:{value:new g(0,0,1)},uNormalCutoff:{value:-.2},uSolidCore:{value:w.solidCore},uFeather:{value:w.fadeWidth},uFeatherWorld:{value:0},uBrushOpacityMul:{value:1}},depthTest:!1,depthWrite:!1,side:W}),this.uvMesh.material=this.brushMaterial,this.brushScene=new L,this.brushScene.add(this.uvMesh),this.brushCamera=new H(-1,1,1,-1,0,2);const u=X,h=new Float32Array(16*u);this.segmentDataTexture=new z(h,4,u,A,Y),this.segmentDataTexture.minFilter=B,this.segmentDataTexture.magFilter=B,this.segmentDataTexture.needsUpdate=!0,this.batchMaskMaterial=new E({vertexShader:_,fragmentShader:ie,uniforms:{uSegmentData:{value:this.segmentDataTexture},uPrevMaskTexture:{value:this.strokeMaskRead.texture},uSegmentCount:{value:0},uSegmentTexHeight:{value:u},uResolution:{value:new F(s,s)},uNormalCutoff:{value:-.2},uSolidCore:{value:w.solidCore},uFeather:{value:w.fadeWidth},uFeatherWorld:{value:0}},depthTest:!1,depthWrite:!1,side:W}),this.coverageMaterial=new E({vertexShader:_,fragmentShader:pe,depthTest:!1,depthWrite:!1,side:W}),this.renderCoverageMask();const l=new Q;l.setAttribute("position",new q([-1,-1,1,-1,1,1,-1,1],2)),l.setIndex([0,1,2,0,2,3]),l.boundingSphere=new Z(new g(0,0,0),Math.SQRT2),this.dilationMaterial=new M({vertexShader:S,fragmentShader:ue,uniforms:{uTexture:{value:null},uCoverageTexture:{value:this.coverageMaskTarget.texture},uTexelSize:{value:new F(1/s,1/s)},uBaseColor:{value:new g(this.baseColor.r,this.baseColor.g,this.baseColor.b)},uThreshold:{value:.05},uStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.copyMaterial=new M({vertexShader:S,fragmentShader:ce,uniforms:{uTexture:{value:null}},depthTest:!1,depthWrite:!1}),this.compositeSumMaterial=new M({vertexShader:S,fragmentShader:ne,uniforms:{uTextureA:{value:null},uTextureB:{value:null},uTextureC:{value:null},uBaseColor:{value:new g(this.baseColor.r,this.baseColor.g,this.baseColor.b)}},depthTest:!1,depthWrite:!1}),this.deltaMapMaterial=new M({vertexShader:S,fragmentShader:le,uniforms:{uTexturePre:{value:null},uTexturePost:{value:null},uBaseColor:{value:new g(this.baseColor.r,this.baseColor.g,this.baseColor.b)},uMarkColor:{value:new g(1,1,1)},uMoreColor:{value:new g(1,1,1)},uLessColor:{value:new g(1,1,1)},uDeadZone:{value:.04},uFullScale:{value:.6},uHatchScale:{value:12},uResolution:{value:new F(s,s)}},depthTest:!1,depthWrite:!1}),this.phaseBlendMaterial=new M({vertexShader:S,fragmentShader:he,uniforms:{uTextureA:{value:null},uTextureB:{value:null},uMix:{value:0}},depthTest:!1,depthWrite:!1}),this.maskUploadMaterial=new M({vertexShader:S,fragmentShader:de,uniforms:{uPrevMaskTexture:{value:null},uUploadTexture:{value:null}},depthTest:!1,depthWrite:!1}),this.strokeCompositeMaterial=new M({vertexShader:S,fragmentShader:oe,uniforms:{uBaseTexture:{value:this.strokeBaseTarget.texture},uMaskTexture:{value:this.strokeMaskRead.texture},uBrushColor:{value:new g(1,.5,0)},uBrushOpacity:{value:.15},uIsErase:{value:0},uReplacePaint:{value:0},uBaseColor:{value:new g(this.baseColor.r,this.baseColor.g,this.baseColor.b)}},depthTest:!1,depthWrite:!1}),this.fullscreenQuad=new I(l,this.dilationMaterial),this.fullscreenQuad.frustumCulled=!1,this.dilationScene=new L,this.dilationScene.add(this.fullscreenQuad),this.dilationCamera=new H(-1,1,1,-1,0,2)}get isStrokeGroupActive(){return this.activeStrokeGroup!==null}get contentRevision(){return this.contentGeneration}get texture(){return this.canvasTexture}get paintResolution(){return this.resolution}prepareExportTexture(){return this.ensureCpuCanvasUpToDate(),this.canvasTexture.needsUpdate=!0,this.canvasTexture}applyToMesh(e=this.mesh){this.appliedMeshes.add(e);const r=e.material,t=s=>{s.userData?.bodyChartPaintExcluded||this.ensurePaintOverlayMaterial(s)};if(Array.isArray(r)){for(const s of r)t(s);return}t(r)}beginStrokeGroup(e={}){this.disposed||(this.activeStrokeGroup&&this.endStrokeGroup(),this.clearMaskCaptureScissor(),this.copyTextureToTarget(this.readTarget.texture,this.strokeBaseTarget),this.clearMaskRenderTarget(this.strokeMaskA),this.clearMaskRenderTarget(this.strokeMaskB),this.strokeMaskRead=this.strokeMaskA,this.strokeMaskWrite=this.strokeMaskB,this.pendingSegments.length=0,this.activeStrokeGroup={colorHex:e.colorHex??this.baseColorStr,opacity:e.opacity??(e.isErase?1:.15),isErase:e.isErase??!1,replacePaint:e.replacePaint??!1,segmentCount:0,batch:e.batch??!1})}strokeGroupSegment(e,r,t,s,a,i){this.disposed||!this.activeStrokeGroup||this.densifySegmentIfCurved(e,r,t,s,a,i,0)||this.emitStrokeSegment(e,r,t,s,a,i)}emitStrokeSegment(e,r,t,s,a,i){this.activeStrokeGroup&&(this.activeStrokeGroup.batch?(this.pendingSegments.push({fromPos:e.clone(),fromNormal:r.clone(),toPos:t.clone(),toNormal:s.clone(),radius:a,opacityMul:i??1}),this.pendingSegments.length>=this.maxSegmentsPerBatch&&this.flushPendingStrokeMaskBatch()):(this.renderStrokeMaskSegment(e,r,t,s,a,i),this.liveCompositePending=!0),this.activeStrokeGroup.segmentCount+=1,this.dirty=!0)}densifySegmentIfCurved(e,r,t,s,a,i,o){if(o>=3)return!1;const n=e.distanceTo(t);if(n<a*.5)return!1;const u=V.clamp(r.dot(s),-1,1);if(u>.966)return!1;const h=Math.acos(u),l=n*Math.tan(h*.25)/2;if(!Number.isFinite(l)||l<=1e-5)return!1;const d=Math.min(l,a*.75),f=e.clone().add(t).multiplyScalar(.5),p=r.clone().add(s);if(p.lengthSq()<1e-8)return!1;p.normalize();const c=f.add(p.clone().multiplyScalar(d)),m=fe(r,s,.5),v=o+1;return this.densifySegmentIfCurved(e,r,c,m,a,i,v)||this.emitStrokeSegment(e,r,c,m,a,i),this.densifySegmentIfCurved(c,m,t,s,a,i,v)||this.emitStrokeSegment(c,m,t,s,a,i),!0}cancelStrokeGroup(){this.disposed||!this.activeStrokeGroup||(this.copyTextureToTarget(this.strokeBaseTarget.texture,this.writeTarget),this.swapTargets(),this.clearMaskRenderTarget(this.strokeMaskA),this.clearMaskRenderTarget(this.strokeMaskB),this.strokeMaskRead=this.strokeMaskA,this.strokeMaskWrite=this.strokeMaskB,this.liveCompositePending=!1,this.pendingSegments.length=0,this.activeStrokeGroup=null,this.syncAppliedMeshesDisplayTexture(),this.dirty=!1,this.cpuReadbackDirty=!0)}endStrokeGroup(){this.disposed||!this.activeStrokeGroup||(this.activeStrokeGroup.batch&&this.flushPendingStrokeMaskBatch(),this.activeStrokeGroup.segmentCount>0&&this.compositeActiveStrokeGroup(),this.liveCompositePending=!1,this.pendingSegments.length=0,this.activeStrokeGroup=null)}strokeGroupMaskAlpha(e,r,t){if(this.disposed||!this.activeStrokeGroup)return;if(t!==this.resolution){J("paint-gpu","mask-upload-resolution-mismatch",{maskResolution:t,painterResolution:this.resolution});return}this.flushPendingStrokeMaskBatch();const s=this.getMaskUploadTexture(e,r),a=this.maskUploadMaterial.uniforms;a.uPrevMaskTexture.value=this.strokeMaskRead.texture,a.uUploadTexture.value=s;const i=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const o=this.renderer.getClearAlpha();this.renderer.setClearColor(0,1),this.fullscreenQuad.material=this.maskUploadMaterial,this.renderer.setRenderTarget(this.strokeMaskWrite),this.renderer.clear(),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial,this.renderer.setClearColor(this.savedClearColor,o),this.renderer.setRenderTarget(i),this.swapMaskTargets(),this.activeStrokeGroup.segmentCount+=1,this.dirty=!0,this.activeStrokeGroup.batch||(this.compositeActiveStrokeGroup(),this.liveCompositePending=!1)}getMaskUploadTexture(e,r){const t=this.maskUploadTextureCache.get(e);if(t)return this.maskUploadTextureCache.delete(e),this.maskUploadTextureCache.set(e,t),t;const s=this.resolution,a=new Uint8Array(s*s*4),i=Math.max(0,r.x0),o=Math.max(0,r.y0),n=Math.min(s,r.x1),u=Math.min(s,r.y1),h=r.x1-r.x0;for(let d=o;d<u;d+=1){const f=(d-r.y0)*h-r.x0,p=(s-1-d)*s;for(let c=i;c<n;c+=1){const m=e[f+c];if(m<=0)continue;const v=m>=1?255:Math.round(Math.min(1,m)*255);a[(p+c)*4]=v}}const l=new z(a,s,s,A,G);if(l.minFilter=B,l.magFilter=B,l.needsUpdate=!0,this.maskUploadTextureCache.set(e,l),this.maskUploadTextureCache.size>D.MASK_UPLOAD_TEXTURE_CACHE_MAX){const d=this.maskUploadTextureCache.keys().next().value;d&&(this.maskUploadTextureCache.get(d)?.dispose(),this.maskUploadTextureCache.delete(d))}return l}stroke(e,r,t,s,a=.15,i){this.disposed||(this.beginStrokeGroup({colorHex:t,opacity:a,style:i}),this.strokeGroupSegment(e,r,e,r,s),this.endStrokeGroup())}strokeLine(e,r,t,s,a,i,o=.15,n){this.disposed||(this.beginStrokeGroup({colorHex:a,opacity:o,style:n}),this.strokeGroupSegment(e,r,t,s,i),this.endStrokeGroup())}erase(e,r,t,s){this.disposed||(this.beginStrokeGroup({isErase:!0,opacity:1,style:s}),this.strokeGroupSegment(e,r,e,r,t),this.endStrokeGroup())}eraseLine(e,r,t,s,a,i){this.disposed||(this.beginStrokeGroup({isErase:!0,opacity:1,style:i}),this.strokeGroupSegment(e,r,t,s,a),this.endStrokeGroup())}flush(){this.liveCompositePending&&this.activeStrokeGroup&&this.compositeActiveStrokeGroup(),this.liveCompositePending=!1,!(!this.dirty||this.disposed)&&(U("ObjectSpacePainter.flush",()=>{this.syncAppliedMeshesDisplayTexture(),this.dirty=!1,this.cpuReadbackDirty=!0},4),ee()&&te()&&U("ObjectSpacePainter.flush.pixelCheck",()=>{this.readbackToCPU(),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1;const e=this.resolution,r=new Uint8Array(4);this.renderer.readRenderTargetPixels(this.readTarget,e/2,e/2,1,1,r);const t=this.cpuCtx.getImageData(e/2,e/2,1,1).data,s=100,a=Math.floor((e-s)/2),i=Math.floor((e-s)/2),o=this.cpuCtx.getImageData(a,i,s,s).data,n=Math.round(this.baseColor.r*255),u=Math.round(this.baseColor.g*255),h=Math.round(this.baseColor.b*255);let l=0;for(let d=0;d<o.length;d+=4){const f=Math.abs(o[d]-n),p=Math.abs(o[d+1]-u),c=Math.abs(o[d+2]-h);f+p+c>15&&l++}re("ObjectSpacePainter.flush pixel check",{rtCenter:[r[0],r[1],r[2],r[3]],cpuCenter:[t[0],t[1],t[2],t[3]],baseColor:[n,u,h],paintPixelsInCenter100x100:l,totalSampled:s*s,meshMapIsRenderTargetTexture:this.mesh.material?.map===this.readTarget.texture,meshMapIsCanvasTexture:this.mesh.material?.map===this.canvasTexture})},4))}flushLiveWithDilation(){if(!(!this.dirty||this.disposed)){if(this.liveCompositePending&&this.activeStrokeGroup&&this.compositeActiveStrokeGroup(),this.liveCompositePending=!1,this.dilationPasses<=0){this.flush();return}U("ObjectSpacePainter.flushLiveWithDilation",()=>{this.runDilationPassesIfContentChanged(),this.syncAppliedMeshesDisplayTexture(),this.dirty=!1,this.cpuReadbackDirty=!0},8)}}flushWithDilation(e={}){if(!this.disposed){if(this.activeStrokeGroup&&this.endStrokeGroup(),this.dilationPasses<=0){this.flush(),e.syncCpu&&this.ensureCpuCanvasUpToDate();return}U("ObjectSpacePainter.flushWithDilation",()=>{this.runDilationPassesIfContentChanged(),this.syncAppliedMeshesDisplayTexture(),this.cpuReadbackDirty=!0,e.syncCpu&&(this.readbackToCPU(),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1),this.dirty=!1},12)}}runDilationPassesIfContentChanged(){this.lastDilatedGeneration!==this.contentGeneration&&(this.runDilationPasses(),this.lastDilatedGeneration=this.contentGeneration)}runDilationPasses(){const e=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const r=this.renderer.getClearAlpha();this.renderer.setClearColor(this.baseColor,1);const t=Math.floor(this.dilationPasses),s=this.dilationPasses-t;for(let a=0;a<t;a++)this.fullscreenQuad.material=this.dilationMaterial,this.dilationMaterial.uniforms.uTexture.value=this.readTarget.texture,this.dilationMaterial.uniforms.uStrength.value=1,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.swapTargets();s>.001&&(this.fullscreenQuad.material=this.dilationMaterial,this.dilationMaterial.uniforms.uTexture.value=this.readTarget.texture,this.dilationMaterial.uniforms.uStrength.value=s,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.swapTargets()),this.renderer.setClearColor(this.savedClearColor,r),this.renderer.setRenderTarget(e)}clear(){this.contentGeneration+=1,this.clearMaskCaptureScissor(),this.activeStrokeGroup=null,this.liveCompositePending=!1,this.pendingSegments.length=0,this.clearRenderTarget(this.rtA),this.clearRenderTarget(this.rtB),this.readTarget=this.rtA,this.writeTarget=this.rtB,this.clearRenderTarget(this.strokeBaseTarget),this.clearMaskRenderTarget(this.strokeMaskA),this.clearMaskRenderTarget(this.strokeMaskB),this.strokeMaskRead=this.strokeMaskA,this.strokeMaskWrite=this.strokeMaskB,this.syncAppliedMeshesDisplayTexture(),this.cpuCtx.fillStyle=this.baseColorStr,this.cpuCtx.fillRect(0,0,this.resolution,this.resolution),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1,this.dirty=!1}warmupShaders(){if(!this.disposed)try{const e=new g(0,.85,.1),r=new g(.001,.851,.1),t=new g(0,0,1),s=.01;this.beginStrokeGroup({opacity:1}),this.strokeGroupSegment(e,t,r,t,s),this.endStrokeGroup(),this.flushWithDilation(),this.captureStrokeMaskAlpha(a=>a(e,t,r,t,s),{})}catch{}finally{this.clear()}}toDataURL(){return this.ensureCpuCanvasUpToDate(),this.cpuCanvas.toDataURL("image/png")}createSnapshotTarget(){const e=this.resolution,r=new k(e,e,{minFilter:R,magFilter:R,format:A,type:G,depthBuffer:!1,stencilBuffer:!1});return r.texture.colorSpace=P,r.texture.anisotropy=this.rtA.texture.anisotropy,r}get atlasResolution(){return this.resolution}snapshotCurrentToTarget(e){this.copyTextureToTarget(this.readTarget.texture,e)}restoreFromSnapshotTarget(e){this.disposed||(this.copyTextureToTarget(e.texture,this.writeTarget),this.swapTargets(),this.contentGeneration+=1,this.syncAppliedMeshesDisplayTexture(),this.dirty=!1,this.cpuReadbackDirty=!0)}sumCompositeToDisplay(e,r,t){const s=this.renderer.getRenderTarget();this.contentGeneration+=1,this.compositeSumMaterial.uniforms.uTextureA.value=e,this.compositeSumMaterial.uniforms.uTextureB.value=r,this.compositeSumMaterial.uniforms.uTextureC.value=t,this.compositeSumMaterial.uniforms.uBaseColor.value.set(this.baseColor.r,this.baseColor.g,this.baseColor.b),this.fullscreenQuad.material=this.compositeSumMaterial,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial,this.swapTargets(),this.syncAppliedMeshesDisplayTexture(),this.cpuReadbackDirty=!0,this.renderer.setRenderTarget(s)}renderDeltaToDisplay(e,r,t){this.contentGeneration+=1;const s=this.renderer.getRenderTarget(),a=this.deltaMapMaterial.uniforms,i=new b(t.markColorHex),o=new b(t.moreColorHex),n=new b(t.lessColorHex);a.uTexturePre.value=e,a.uTexturePost.value=r,a.uBaseColor.value.set(this.baseColor.r,this.baseColor.g,this.baseColor.b),a.uMarkColor.value.set(i.r,i.g,i.b),a.uMoreColor.value.set(o.r,o.g,o.b),a.uLessColor.value.set(n.r,n.g,n.b),this.fullscreenQuad.material=this.deltaMapMaterial,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial,this.swapTargets(),this.syncAppliedMeshesDisplayTexture(),this.cpuReadbackDirty=!0,this.renderer.setRenderTarget(s)}blendPhasesToDisplay(e,r,t){this.contentGeneration+=1;const s=this.renderer.getRenderTarget();t===0?this.copyTextureToTarget(e,this.writeTarget):(this.phaseBlendMaterial.uniforms.uTextureA.value=e,this.phaseBlendMaterial.uniforms.uTextureB.value=r,this.phaseBlendMaterial.uniforms.uMix.value=t,this.fullscreenQuad.material=this.phaseBlendMaterial,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial),this.swapTargets(),this.syncAppliedMeshesDisplayTexture(),this.cpuReadbackDirty=!0,this.renderer.setRenderTarget(s)}fromDataURL(e){return new Promise(r=>{const t=new Image;t.onload=()=>{this.cpuCtx.drawImage(t,0,0,this.resolution,this.resolution),this.uploadCPUToRT(),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1,r()},t.src=e})}async loadFromImageSource(e){if(this.disposed)return;let r=null,t;e instanceof Blob?(r=await createImageBitmap(e),t=r):t=e;try{this.cpuCtx.fillStyle=this.baseColorStr,this.cpuCtx.fillRect(0,0,this.resolution,this.resolution),this.cpuCtx.drawImage(t,0,0,this.resolution,this.resolution),this.uploadCPUToRT(),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1;for(const s of this.undoStack)s.close();for(const s of this.redoStack)s.close();this.undoStack.length=0,this.redoStack.length=0}finally{r&&r.close()}}findPaintCentroid(){this.ensureCpuCanvasUpToDate();const e=this.resolution,r=4,t=this.cpuCtx.getImageData(0,0,e,e).data,s=Math.round(this.baseColor.r*255),a=Math.round(this.baseColor.g*255),i=Math.round(this.baseColor.b*255),o=20;let n=0,u=0,h=0;for(let l=0;l<e;l+=r)for(let d=0;d<e;d+=r){const f=(l*e+d)*4,p=t[f]-s,c=t[f+1]-a,m=t[f+2]-i,v=Math.sqrt(p*p+c*c+m*m);v<o||(n+=d*v,u+=l*v,h+=v)}return h===0?null:{x:n/h/e,y:1-u/h/e}}captureStrokeMaskAlpha(e,r={}){if(this.disposed)return{alphaMap:new Float32Array,bounds:null};if(this.activeStrokeGroup)throw new Error("Cannot capture a stroke mask while another stroke group is active.");const t=K(r.readbackBounds,this.resolution),s=this.dirty;this.beginMaskCaptureGroup(t);try{e((o,n,u,h,l,d)=>{this.strokeGroupSegment(o,n,u,h,l,d)}),this.flushPendingStrokeMaskBatch();const a=this.readRenderTargetRedChannel(this.strokeMaskRead,t),i=r.opacity??1;if(i!==1)for(let o=0;o<a.alphaMap.length;o+=1)a.alphaMap[o]=Math.min(a.alphaMap[o]*i,1);return a}finally{this.endMaskCaptureGroup(),this.dirty=s}}async captureStrokeMaskAlphaAsync(e,r={}){if(this.disposed)return{alphaMap:new Float32Array,bounds:null};if(this.activeStrokeGroup)throw new Error("Cannot capture a stroke mask while another stroke group is active.");const t=K(r.readbackBounds,this.resolution),s=this.dirty;let a=!1;this.beginMaskCaptureGroup(t);try{e((u,h,l,d,f,p)=>{this.strokeGroupSegment(u,h,l,d,f,p)}),this.flushPendingStrokeMaskBatch();const i=this.readRenderTargetRedChannelAsync(this.strokeMaskRead,t);this.endMaskCaptureGroup(),a=!0,this.dirty=s;const o=await i,n=r.opacity??1;if(n!==1)for(let u=0;u<o.alphaMap.length;u+=1)o.alphaMap[u]=Math.min(o.alphaMap[u]*n,1);return o}finally{a||this.endMaskCaptureGroup(),this.dirty=s}}beginMaskCaptureGroup(e){this.applyMaskCaptureScissor(e),this.clearMaskRenderTarget(this.strokeMaskA),this.strokeMaskRead=this.strokeMaskA,this.strokeMaskWrite=this.strokeMaskB,this.pendingSegments.length=0,this.activeStrokeGroup={colorHex:this.baseColorStr,opacity:1,isErase:!1,replacePaint:!1,segmentCount:0,batch:!0}}endMaskCaptureGroup(){this.pendingSegments.length=0,this.activeStrokeGroup=null,this.clearMaskCaptureScissor()}applyMaskCaptureScissor(e){if(!e){this.clearMaskCaptureScissor();return}const r=e.x1-e.x0,t=e.y1-e.y0;if(r<=0||t<=0){this.clearMaskCaptureScissor();return}const s=this.resolution-e.y1;for(const a of[this.strokeMaskA,this.strokeMaskB])a.scissor.set(e.x0,s,r,t),a.scissorTest=!0}clearMaskCaptureScissor(){this.strokeMaskA.scissorTest=!1,this.strokeMaskB.scissorTest=!1}pushHistory(){this.ensureCpuCanvasUpToDate(),createImageBitmap(this.cpuCanvas).then(e=>{this.undoStack.push(e),this.undoStack.length>D.MAX_HISTORY&&this.undoStack.shift()?.close();for(const r of this.redoStack)r.close();this.redoStack.length=0})}undo(){if(this.undoStack.length===0)return!1;this.ensureCpuCanvasUpToDate(),createImageBitmap(this.cpuCanvas).then(r=>this.redoStack.push(r));const e=this.undoStack.pop();return this.cpuCtx.clearRect(0,0,this.resolution,this.resolution),this.cpuCtx.drawImage(e,0,0),e.close(),this.uploadCPUToRT(),this.canvasTexture.needsUpdate=!0,!0}redo(){if(this.redoStack.length===0)return!1;this.ensureCpuCanvasUpToDate(),createImageBitmap(this.cpuCanvas).then(r=>this.undoStack.push(r));const e=this.redoStack.pop();return this.cpuCtx.clearRect(0,0,this.resolution,this.resolution),this.cpuCtx.drawImage(e,0,0),e.close(),this.uploadCPUToRT(),this.canvasTexture.needsUpdate=!0,!0}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get isDirty(){return this.dirty}hasPaintAt(e,r){this.ensureCpuCanvasUpToDate();const t=this.resolution,s=Math.round(e.x*t),a=Math.round((1-e.y)*t),i=Math.round(r*t),o=Math.max(0,s-i),n=Math.max(0,a-i),u=Math.min(t,s+i),h=Math.min(t,a+i);if(u<=o||h<=n)return!1;const l=this.cpuCtx.getImageData(o,n,u-o,h-n).data,d=Math.round(this.baseColor.r*255),f=Math.round(this.baseColor.g*255),p=Math.round(this.baseColor.b*255);for(let c=0;c<l.length;c+=16){const m=l[c]-d,v=l[c+1]-f,x=l[c+2]-p;if(m*m+v*v+x*x>400)return!0}return!1}rebuildGeometry(e,r){if(this.contentGeneration+=1,this.disposed)return;let t;if(r)t=r.clone(),t.getAttribute("normal")||t.computeVertexNormals();else{const a=(e&&e.length>0?e:[this.mesh]).map(i=>this.createBrushGeometry(i));t=a.length>1?this.mergeBufferGeometries(a):a[0];for(const i of a)i!==t&&i.dispose()}this.uvMesh.geometry.dispose(),this.uvMesh.geometry=t,this.uvMeshWorldBaked=!0,this.renderCoverageMask()}dispose(){this.disposed=!0,this.restoreAppliedMaterials(),this.rtA.dispose(),this.rtB.dispose(),this.strokeMaskA.dispose(),this.strokeMaskB.dispose(),this.strokeBaseTarget.dispose(),this.brushMaterial.dispose(),this.batchMaskMaterial.dispose(),this.coverageMaterial.dispose(),this.coverageMaskTarget.dispose(),this.segmentDataTexture.dispose(),this.maskUploadMaterial.dispose();for(const e of this.maskUploadTextureCache.values())e.dispose();this.maskUploadTextureCache.clear(),this.dilationMaterial.dispose(),this.copyMaterial.dispose(),this.phaseBlendMaterial.dispose(),this.compositeSumMaterial.dispose(),this.deltaMapMaterial.dispose(),this.strokeCompositeMaterial.dispose(),this.uvMesh.geometry.dispose(),this.canvasTexture.dispose();for(const e of this.undoStack)e.close();for(const e of this.redoStack)e.close();this.undoStack.length=0,this.redoStack.length=0,this.appliedMeshes.clear()}createBrushGeometry(e){const r=se(e,{requiredAttributes:["position","uv"]});if(!r)throw new Error("ObjectSpacePainter could not create a posed brush geometry for the mesh.");const t=r.getAttribute("position"),s=r.getAttribute("uv");if(!t||!s)throw new Error("ObjectSpacePainter requires brush geometries with position and uv attributes.");r.computeVertexNormals();const a=new Set(["position","normal","uv"]);for(const i of Object.keys(r.attributes))a.has(i)||r.deleteAttribute(i);return r}mergeBufferGeometries(e){if(e.length===0)throw new Error("ObjectSpacePainter requires at least one geometry to merge.");const r=e.map(t=>{const s=t.index?t.toNonIndexed()??t.clone():t.clone();return s.getAttribute("normal")||s.computeVertexNormals(),s});try{const t=new Q;for(const s of["position","normal","uv"]){const a=r[0].getAttribute(s);if(!a)throw new Error(`ObjectSpacePainter merge missing required ${s} attribute.`);let i=0;for(const u of r){const h=u.getAttribute(s);if(!h)throw new Error(`ObjectSpacePainter merge encountered geometry without ${s}.`);i+=h.array.length}const o=new Float32Array(i);let n=0;for(const u of r){const h=u.getAttribute(s);o.set(h.array,n),n+=h.array.length}t.setAttribute(s,new $(o,a.itemSize))}return t}finally{for(const t of r)t.dispose()}}ensureCpuCanvasUpToDate(){this.disposed||(this.dirty&&this.flush(),this.cpuReadbackDirty&&(this.readbackToCPU(),this.canvasTexture.needsUpdate=!0,this.cpuReadbackDirty=!1))}syncAppliedMeshesDisplayTexture(){const e=this.readTarget.texture;for(const r of this.appliedMeshes){const t=r.material,s=a=>{if(a.userData?.bodyChartPaintExcluded)return;const i=this.appliedMaterialStates.get(a);if(!i){this.ensurePaintOverlayMaterial(a);return}i.shader?.uniforms?.uBodyChartPaintTexture&&(i.shader.uniforms.uBodyChartPaintTexture.value=e)};if(Array.isArray(t)){for(const a of t)s(a);continue}s(t)}}ensurePaintOverlayMaterial(e){if(this.appliedMaterialStates.has(e))return;const r={originalMap:e.map,originalColor:e.color.clone(),originalOnBeforeCompile:e.onBeforeCompile,originalCustomProgramCacheKey:e.customProgramCacheKey,shader:null};this.appliedMaterialStates.set(e,r),e.onBeforeCompile=t=>{r.originalOnBeforeCompile?.call(e,t,this.renderer),t.uniforms.uBodyChartPaintTexture={value:this.readTarget.texture},t.uniforms.uBodyChartPaintBaseColor={value:new g(this.baseColor.r,this.baseColor.g,this.baseColor.b)},r.shader=t,t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vBodyChartPaintUv;`),t.vertexShader=t.vertexShader.replace("#include <uv_vertex>",`#include <uv_vertex>
vBodyChartPaintUv = uv;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vBodyChartPaintUv;
uniform sampler2D uBodyChartPaintTexture;
uniform vec3 uBodyChartPaintBaseColor;`),t.fragmentShader=t.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
        vec4 bodyChartPaintSample = texture2D(uBodyChartPaintTexture, vBodyChartPaintUv);
        vec3 bodyChartPaintDelta = abs(bodyChartPaintSample.rgb - uBodyChartPaintBaseColor);
        float bodyChartPaintAlpha = clamp(max(max(bodyChartPaintDelta.r, bodyChartPaintDelta.g), bodyChartPaintDelta.b) * 2.8, 0.0, 1.0);
        if (bodyChartPaintAlpha > 0.0) {
          vec3 bodyChartPaintOverlayColor = clamp(
            (bodyChartPaintSample.rgb - uBodyChartPaintBaseColor * (1.0 - bodyChartPaintAlpha)) /
              max(bodyChartPaintAlpha, 0.0001),
            0.0,
            1.0
          );
          diffuseColor.rgb = mix(diffuseColor.rgb, bodyChartPaintOverlayColor, bodyChartPaintAlpha);
        }`)},e.customProgramCacheKey=()=>`${r.originalCustomProgramCacheKey?.call(e)??""}|body-chart-paint-overlay-v1`,e.map=r.originalMap,e.color.copy(r.originalColor),e.needsUpdate=!0}restoreAppliedMaterials(){for(const[e,r]of this.appliedMaterialStates)e.map=r.originalMap,e.color.copy(r.originalColor),e.onBeforeCompile=r.originalOnBeforeCompile,e.customProgramCacheKey=r.originalCustomProgramCacheKey,e.needsUpdate=!0;this.appliedMaterialStates.clear()}setupBrushMeshTransform(){if(this.uvMeshWorldBaked){this.uvMesh.matrix.identity(),this.uvMesh.matrixWorld.identity();return}this.mesh.updateMatrixWorld(!0),this.uvMesh.matrix.copy(this.mesh.matrixWorld),this.uvMesh.matrixWorld.copy(this.mesh.matrixWorld)}renderCoverageMask(){if(this.disposed)return;this.setupBrushMeshTransform();const e=this.uvMesh.material;this.uvMesh.material=this.coverageMaterial;const r=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const t=this.renderer.getClearAlpha();this.renderer.setClearColor(0,1),this.renderer.setRenderTarget(this.coverageMaskTarget),this.renderer.clear(),this.renderer.render(this.brushScene,this.brushCamera),this.renderer.setClearColor(this.savedClearColor,t),this.renderer.setRenderTarget(r),this.uvMesh.material=e}applyBrushFalloffUniforms(e){e.uSolidCore.value=w.solidCore,e.uFeather.value=w.fadeWidth,e.uFeatherWorld.value=0}renderStrokeMaskSegment(e,r,t,s,a,i){U("paint-gpu:render-mask-segment",()=>{this.setupBrushMeshTransform();const o=this.brushMaterial.uniforms;o.uBrushFrom.value.copy(e),o.uBrushTo.value.copy(t),o.uBrushRadius.value=a,o.uPrevMaskTexture.value=this.strokeMaskRead.texture,o.uBrushNormalFrom.value.copy(r),o.uBrushNormalTo.value.copy(s),this.applyBrushFalloffUniforms(o),o.uBrushOpacityMul.value=i??1;const n=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const u=this.renderer.getClearAlpha();this.renderer.setClearColor(0,1),this.renderer.setRenderTarget(this.strokeMaskWrite),this.renderer.render(this.brushScene,this.brushCamera),this.renderer.setClearColor(this.savedClearColor,u),this.renderer.setRenderTarget(n),this.swapMaskTargets()},4)}flushPendingStrokeMaskBatch(){this.pendingSegments.length!==0&&(this.renderStrokeMaskBatch(),this.pendingSegments.length=0)}renderStrokeMaskBatch(){const e=this.pendingSegments;if(e.length===0)return;const r=typeof performance<"u"?performance.now():Date.now();try{this.setupBrushMeshTransform();const t=this.segmentDataTexture.image.data,s=16;for(let u=0;u<e.length;u++){const h=e[u],l=u*s;t[l+0]=h.fromPos.x,t[l+1]=h.fromPos.y,t[l+2]=h.fromPos.z,t[l+3]=h.toPos.x,t[l+4]=h.toPos.y,t[l+5]=h.toPos.z,t[l+6]=h.fromNormal.x,t[l+7]=h.fromNormal.y,t[l+8]=h.fromNormal.z,t[l+9]=h.toNormal.x,t[l+10]=h.toNormal.y,t[l+11]=h.toNormal.z,t[l+12]=h.radius,t[l+13]=h.opacityMul,t[l+14]=0,t[l+15]=0}this.segmentDataTexture.needsUpdate=!0;const a=this.batchMaskMaterial.uniforms;a.uPrevMaskTexture.value=this.strokeMaskRead.texture,a.uSegmentCount.value=e.length,this.applyBrushFalloffUniforms(a);const i=this.uvMesh.material;this.uvMesh.material=this.batchMaskMaterial;const o=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const n=this.renderer.getClearAlpha();this.renderer.setClearColor(0,1),this.renderer.setRenderTarget(this.strokeMaskWrite),this.renderer.clear(),this.renderer.render(this.brushScene,this.brushCamera),this.renderer.setClearColor(this.savedClearColor,n),this.renderer.setRenderTarget(o),this.uvMesh.material=i,this.swapMaskTargets()}finally{const t=typeof performance<"u"?performance.now():Date.now();y("paint-gpu:render-mask-batch",t-r,8)}}compositeActiveStrokeGroup(){if(!this.activeStrokeGroup)return;this.contentGeneration+=1;const e=typeof performance<"u"?performance.now():Date.now();try{const r=this.strokeCompositeMaterial.uniforms,t=new b(this.activeStrokeGroup.colorHex);r.uBaseTexture.value=this.strokeBaseTarget.texture,r.uMaskTexture.value=this.strokeMaskRead.texture,r.uBrushColor.value.set(t.r,t.g,t.b),r.uBrushOpacity.value=this.activeStrokeGroup.opacity,r.uIsErase.value=this.activeStrokeGroup.isErase?1:0,r.uReplacePaint.value=this.activeStrokeGroup.replacePaint?1:0;const s=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const a=this.renderer.getClearAlpha();this.renderer.setClearColor(this.baseColor,1),this.fullscreenQuad.material=this.strokeCompositeMaterial,this.renderer.setRenderTarget(this.writeTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial,this.renderer.setClearColor(this.savedClearColor,a),this.renderer.setRenderTarget(s),this.swapTargets()}finally{const r=typeof performance<"u"?performance.now():Date.now();y("paint-gpu:composite-stroke-preview",r-e,4)}}swapTargets(){const e=this.readTarget;this.readTarget=this.writeTarget,this.writeTarget=e}swapMaskTargets(){const e=this.strokeMaskRead;this.strokeMaskRead=this.strokeMaskWrite,this.strokeMaskWrite=e}clearRenderTarget(e){const r=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const t=this.renderer.getClearAlpha();this.renderer.setRenderTarget(e),this.renderer.setClearColor(this.baseColor,1),this.renderer.clear(),this.renderer.setClearColor(this.savedClearColor,t),this.renderer.setRenderTarget(r)}clearMaskRenderTarget(e){const r=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const t=this.renderer.getClearAlpha();this.renderer.setRenderTarget(e),this.renderer.setClearColor(0,1),this.renderer.clear(),this.renderer.setClearColor(this.savedClearColor,t),this.renderer.setRenderTarget(r)}copyTextureToTarget(e,r){const t=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const s=this.renderer.getClearAlpha();this.renderer.setClearColor(this.baseColor,1),this.fullscreenQuad.material=this.copyMaterial,this.copyMaterial.uniforms.uTexture.value=e,this.renderer.setRenderTarget(r),this.renderer.render(this.dilationScene,this.dilationCamera),this.fullscreenQuad.material=this.dilationMaterial,this.renderer.setClearColor(this.savedClearColor,s),this.renderer.setRenderTarget(t)}readbackToCPU(){const e=typeof performance<"u"?performance.now():Date.now();try{const r=this.resolution,t=new Uint8Array(r*r*4);this.renderer.readRenderTargetPixels(this.readTarget,0,0,r,r,t);const s=this.cpuCtx.createImageData(r,r);for(let a=0;a<r;a++){const i=(r-1-a)*r*4,o=a*r*4;s.data.set(t.subarray(i,i+r*4),o)}this.cpuCtx.putImageData(s,0,0)}finally{const r=typeof performance<"u"?performance.now():Date.now();y("ObjectSpacePainter.readbackToCPU",r-e,4)}}readRenderTargetRedChannel(e,r){const t=this.resolution,s=r??{x0:0,y0:0,x1:t,y1:t},a=s.x1-s.x0,i=s.y1-s.y0,o=new Uint8Array(a*i*4),n=()=>typeof performance<"u"?performance.now():Date.now(),u=n();return this.renderer.readRenderTargetPixels(e,s.x0,t-s.y1,a,i,o),y("pain-visibility-snapshot:gl-readback",n()-u,4),this.decodeRenderTargetRedChannel(o,s)}async readRenderTargetRedChannelAsync(e,r){const t=this.resolution,s=r??{x0:0,y0:0,x1:t,y1:t},a=s.x1-s.x0,i=s.y1-s.y0,o=new Uint8Array(a*i*4),n=()=>typeof performance<"u"?performance.now():Date.now(),u=n(),h=this.renderer;return typeof h.readRenderTargetPixelsAsync=="function"?await h.readRenderTargetPixelsAsync(e,s.x0,t-s.y1,a,i,o):h.readRenderTargetPixels(e,s.x0,t-s.y1,a,i,o),y("pain-visibility-snapshot:gl-readback-async-wait",n()-u,4),this.decodeRenderTargetRedChannel(o,s)}decodeRenderTargetRedChannel(e,r){this.resolution;const t=r.x1-r.x0,s=r.y1-r.y0;let a=r.x1,i=r.y1,o=r.x0,n=r.y0,u=!1;const h=()=>typeof performance<"u"?performance.now():Date.now(),l=h();for(let c=0;c<s;c+=1){const m=r.y0+c,v=(s-1-c)*t*4;for(let x=0;x<t;x+=1){const T=r.x0+x;e[v+x*4]/255<=0||(T<a&&(a=T),m<i&&(i=m),T+1>o&&(o=T+1),m+1>n&&(n=m+1),u=!0)}}if(!u)return y("pain-visibility-snapshot:cpu-scan",h()-l,4),{alphaMap:new Float32Array,bounds:null};const d=o-a,f=n-i,p=new Float32Array(d*f);for(let c=i;c<n;c+=1){const m=c-r.y0,v=(s-1-m)*t*4,x=(c-i)*d;for(let T=a;T<o;T+=1){const N=T-r.x0;p[x+(T-a)]=e[v+N*4]/255}}return y("pain-visibility-snapshot:cpu-scan",h()-l,4),{alphaMap:p,bounds:{x0:a,y0:i,x1:o,y1:n}}}uploadCPUToRT(){this.contentGeneration+=1;const e=new O(this.cpuCanvas);e.flipY=!1,e.needsUpdate=!0,this.fullscreenQuad.material=this.copyMaterial,this.copyMaterial.uniforms.uTexture.value=e;const r=this.renderer.getRenderTarget();this.renderer.getClearColor(this.savedClearColor);const t=this.renderer.getClearAlpha();this.renderer.setClearColor(this.baseColor,1),this.renderer.setRenderTarget(this.readTarget),this.renderer.render(this.dilationScene,this.dilationCamera),this.renderer.setClearColor(this.savedClearColor,t),this.renderer.setRenderTarget(r),this.fullscreenQuad.material=this.dilationMaterial,this.syncAppliedMeshesDisplayTexture(),e.dispose()}};D.MAX_HISTORY=20,D.MASK_UPLOAD_TEXTURE_CACHE_MAX=8;let j=D;function fe(C,e,r){const t=V.clamp(C.dot(e),-1,1);if(t>.9995)return C.clone().lerp(e,r).normalize();const s=Math.acos(t),a=Math.sin(s),i=Math.sin((1-r)*s)/a,o=Math.sin(r*s)/a;return C.clone().multiplyScalar(i).add(e.clone().multiplyScalar(o))}export{j as ObjectSpacePainter};
