class Graph {
    constructor(canvas_selector, data){
        this.P = 100;   //padding
        this.fontSize = 13;

        this.data = data;
        this.$canvas = document.querySelector(canvas_selector);
        this.ctx = this.$canvas.getContext("2d");

        // Canvas 설정
        this.ctx.font = `${this.fontSize}px 나눔스퀘어, sans-serif`;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        this.init(); // 데이터 변수 설정
        this.hoverEvent(); // 캔버스 호버 이벤트
    }

    /**
     * 데이터 변수 설정
     */
    init(){
        // Hover 한 대상의 인덱스
        this.hoverData = null;


        // 데이터 내의 최댓값과 최솟값, Y축의 최댓값과 최솟값 계산
        let maxValue = this.data.reduce((p, c) => Math.max(p, c.value), this.data[0].value);
        let minValue = this.data.reduce((p, c) => Math.min(p, c.value), this.data[0].value);

        this.unit = 10;
        let absolute = (maxValue - minValue);
        while(this.unit < absolute) this.unit *= 10;
        this.unit /= 10;

        this.max = 0;
        while(this.max < maxValue) this.max += this.unit;
        
        this.min = this.max;
        while(this.min > minValue) this.min -= this.unit;

        // 데이터의 X, Y값 계산
        const {width, height} = this.$canvas;
        const innerHeight = height - this.P * 1.5;
        let unitX = (width - this.P * 1.5) / (this.data.length + 1);
        this.data = this.data.map((item, i) => {
            item.X = parseInt(this.P + unitX * (i + 1)); 
            item.Y = parseInt(height - this.P - (innerHeight * (item.value - this.min) / (this.max - this.min)));
            return item;
        });


        // 프레임마다 증감할 값 계산
        this.COUNT = 30; // 프레임당 반복 횟수
        this.HALF = this.P / 2  + (height - this.P * 1.5) / 2;
        this.unitList = this.data.map(item => (item.Y - this.HALF) / this.COUNT);
    }

    /**
     * Hover 이벤트 관리
     */
    hoverEvent(){
        this.moveSpeed = 30;
        this.boxOpaicty = 0.7;
        this.$canvas.addEventListener("mousemove", e => {
            const {offsetX} = e;                    
            const innerWidth = this.$canvas.width - this.P * 1.5;   // 캡션을 제외한 순수 그래프만의 너비
            const section_W = innerWidth / (this.data.length);          // 각 섹션별 너비

            // 섹션의 X 값과 너비를 통해 현재 커서가 어떤 섹션에 닿아있는 지 검사
            const findItem = this.data.find(item => item.X - section_W / 2 <= offsetX && offsetX <= item.X + section_W / 2);
            
            // 마우스와 닿은 섹션이 있다면...
            if(findItem){
                // 이전 호버 데이터가 있으면 이전 데이터의 좌표 및 값을 바꿔치기
                if(this.hoverData){
                    const {key, value, X, Y} = findItem;
                    this.hoverData.key = key;
                    this.hoverData.value = value;
                    this.hoverData.toX = X;
                    this.hoverData.toY = Y;
                }
                else {
                    this.hoverData = Object.assign({}, findItem);   // 이 데이터가 처음이면 원본 데이터의 복사본을 생성한다.
                    this.hoverData.toX = findItem.X;
                    this.hoverData.toY = findItem.Y;
                    this.hoverData.opacity = 0;                     // 투명도 0부터 시작한다.
                }


                // 1 Frame 당 움직일 픽셀수(변동될 투명도 값)를 구한다.
                const {X, Y, toX, toY, opacity} = this.hoverData;
                this.hoverData.unitX = (toX - X) / this.moveSpeed;
                this.hoverData.unitY = (toY - Y) / this.moveSpeed;
                this.hoverData.unitO = (this.boxOpaicty - opacity) / this.moveSpeed;
                
            }
            // 마우스와 닿은 섹션이 없으면
            else {
                if(this.hoverData){     // 이전 호버 데이터를 가지고 있었다면?
                    const {opacity} = this.hoverData;
                    this.hoverData.unitO = (-opacity) / this.moveSpeed; // 투명도를 줄여야한다.
                }
            }

        });

        this.$canvas.addEventListener("mouseleave", e => {
            if(this.hoverData){
                const {opacity} = this.hoverData;
                this.hoverData.unitO = (-opacity) / this.moveSpeed;
            }
        });

        
    }

    /**
     * 그리기 시작 함수 :: 중앙값부터 펼쳐지는 애니메이션이 작동한다.
     */
    draw(){
        // Y값을 그래프의 중앙값으로 시작하여 그린다.
        let viewList = JSON.parse(JSON.stringify(this.data));
        viewList = viewList.map(item => {
            item.Y = this.HALF;
            return item;
        });

        this.render(viewList);
    }

    /**
     * 그리기 총괄 함수 :: 모든 draw 함수를 관리한다.
     */
    render(viewList, r_count = 0){   
        const {width, height} = this.$canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.drawBackground();      // X, Y축과 같은 배경 그래프를 그린다.
        this.drawGraph(viewList);   // 그래프 선을 그린다.

        if(r_count < this.COUNT){
            viewList = viewList.map((item, idx) => {
                item.Y += this.unitList[idx];
                return item;
            });
        }
        if(this.hoverData !== null){
            this.drawDetailBox();
        }
        this.requestAnimation = requestAnimationFrame(() => this.render(viewList, ++r_count));
    }

    drawBackground() {
        const {P, ctx} = this;
        const {width, height} = this.$canvas;
        
        // 주조선
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = "#707070";
        ctx.beginPath();
        ctx.moveTo(P, P / 2);
        ctx.lineTo(P, height - P);
        ctx.lineTo(width - P / 2, height - P);
        ctx.stroke();

        // 보조선
        ctx.lineWidth = "0.5";
        ctx.strokeStyle = "#C1C1C1";
        ctx.beginPath();
        ctx.moveTo(width - P / 2, P / 2);
        ctx.lineTo(width - P / 2, height - P);
        ctx.stroke();


        // Y축
        let startX = P - 10;
        let length = (this.max - this.min) / this.unit + 1;
        let unitY = (height - P * 1.5) / (length - 1);
        for(let i = 0; i < length; i++){
            let Y = P / 2 + unitY  * i;
            ctx.beginPath();
            ctx.moveTo(startX, Y);
            ctx.lineTo(width - P / 2, Y);
            ctx.stroke();

            let text = ((this.max / this.unit) - i) * this.unit;
            const measure = ctx.measureText(text);
            ctx.fillText(text, startX - measure.width - 5, Y + 4);
        }

        // X축
        let endY = height - P + 10;
        this.data.forEach(item => {
            ctx.beginPath();
            ctx.moveTo(item.X, P / 2);
            ctx.lineTo(item.X, endY);
            ctx.stroke();

            const measure = ctx.measureText(item.key);
            ctx.fillText(item.key, item.X - measure.width / 2, endY + 18);
        });
    }

    drawGraph(viewList){
        const {ctx} = this;

        ctx.strokeStyle = ctx.fillStyle = "#25D786";
        ctx.lineWidth = "2";

        viewList.forEach(item => {
            // 원
            ctx.beginPath();
            ctx.arc(item.X, item.Y, 5, 0, Math.PI * 2);
            ctx.fill();
        }); 

        let first = viewList[0];
        ctx.beginPath();
        ctx.moveTo(first.X, first.Y);

        for(let i = 0; i < viewList.length - 1; i++){
            let item = viewList[i];
            let next = viewList[i+1];

            // 곡선
            let centerX = (item.X + next.X) / 2;
            let centerY = (item.Y + next.Y) / 2;
            
            let cx1 = (item.X + centerX) / 2;
            let cx2 = (next.X + centerX) / 2;
            
            ctx.quadraticCurveTo(cx1, item.Y, centerX, centerY);
            ctx.quadraticCurveTo(cx2, next.Y, next.X, next.Y);
        }  
        ctx.stroke();
    }

    drawDetailBox(){
        if(!this.hoverData) return;
        const boxPadding = 10;
        const boxOpaicty = this.boxOpaicty;
    
        let {X, Y, key, value, opacity, unitX, unitY, unitO, toX, toY} = this.hoverData;
        // Frame이 돌아갈 때마다 향할 좌표(toX, toY)를 향해 움직일 값을 재계산한다.
        this.hoverData.unitX = (toX - X) / this.moveSpeed * 2;
        this.hoverData.unitY = (toY - Y) / this.moveSpeed * 2;

        this.hoverData.X = X = X + unitX;
        this.hoverData.Y = Y = Y + unitY;

        // 투명도가 상자 투명도의 최댓값(boxOpacity)를 넘지 않고, 0 미만이 되지 않도록 검사
        this.hoverData.opacity = opacity = opacity + unitO < 0 ? 0 : opacity + unitO > boxOpaicty ? boxOpaicty : opacity + unitO;
        

        
        // Render
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = `#000`;

    
        let W = Math.max(this.ctx.measureText(key).width, this.ctx.measureText(value).width) + boxPadding * 2;
        let H = this.fontSize * 2.5 + boxPadding * 2;
        if(X > this.$canvas.width / 2){
            X = X - W - 10;
            Y = Y - H / 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(X + W, Y);
            this.ctx.lineTo(X + W, Y + H / 2 - 5);
            this.ctx.lineTo(X + W + 5, Y + H / 2);
            this.ctx.lineTo(X + W, Y + H / 2 + 5);
            this.ctx.lineTo(X + W, Y + H);
            this.ctx.lineTo(X, Y + H);
            this.ctx.lineTo(X, Y);
            this.ctx.closePath();
            this.ctx.fill();
        }
        else {
            X = X + 10;
            Y = Y - H / 2;

            this.ctx.beginPath();
            this.ctx.moveTo(X, Y);
            this.ctx.lineTo(X, Y + H / 2 - 5);
            this.ctx.lineTo(X - 5, Y + H / 2);
            this.ctx.lineTo(X, Y + H / 2 + 5);
            this.ctx.lineTo(X, Y + H);
            this.ctx.lineTo(X + W, Y + H);
            this.ctx.lineTo(X + W, Y);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.globalAlpha = opacity < 0.1 ? 0 : 1;

        this.ctx.fillStyle = `#fff`;
        this.ctx.fillText(key, X + boxPadding, Y + boxPadding + this.fontSize);
        this.ctx.fillText(value, X + boxPadding, Y + boxPadding + this.fontSize * 2.5);
        
    }
}



