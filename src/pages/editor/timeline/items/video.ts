import { Video as VideoBase, VideoProps } from "@designcombo/timeline";

class Video extends VideoBase {
  static type = "Video";
  
  constructor(props: VideoProps) {
    super(props);
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    const rectPath = new Path2D('M14 3h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1');
    const mainPath = new Path2D('M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3');

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.translate(0, 14);
    
    // Text rendering
    ctx.font = "600 12px 'Geist variable'";
    ctx.fillStyle = "#f4f4f5";
    ctx.textAlign = "left";
    ctx.clip();
    // TODO: show blockName here
    ctx.fillText("Block", 36, 10);
    
    // Icon rendering with adjusted position and scale
    ctx.translate(8, -3); // Adjusted Y translation for vertical alignment
    ctx.scale(0.7, 0.7); // Scale down the icon
    
    ctx.strokeStyle = "#f4f4f5";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    ctx.stroke(rectPath);
    ctx.stroke(mainPath);
    
    //console.log(this.src);
    ctx.restore();
  }
}

export default Video;