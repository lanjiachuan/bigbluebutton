import React from 'react';
import { findDOMNode } from 'react-dom';

export default class PollDrawComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // flag indicating whether we need to continue calculating the sizes or display the shape
      prepareToDisplay: true,

      // outer (white) rectangle's coordinates and sizes (calculated in componentWillMount)
      outerRect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },

      // inner rectangle's coordinates and sizes
      innerRect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      thickness: 0,
      backgroundColor: '#ffffff',

      // max line sizes
      maxLineWidth: 0,
      maxLineHeight: 0,

      // max widths of the keys (left) and percent (right) strings
      maxLeftWidth: 0,
      maxRightWidth: 0,

      // these parameters are used in calculations before and while displaying the final result
      votesTotal: 0,
      maxNumVotes: 0,
      textArray: [],
      maxDigitWidth: 0,
      maxDigitHeight: 0,

      // start value used for font-size calculations
      calcFontSize: 50,
      currentLine: 0,
      lineToMeasure: [],
      fontSizeDirection: 1,
    };
  }

  //this might have to be changed if we want to reuse it for a presenter's poll popup
  shouldComponentUpdate(nextProps, nextState) {
    return this.state.prepareToDisplay == true;
  }

  componentWillMount() {
    // in this part we retrieve the props and perform initial calculations for the state
    // calculating only the parts which have to be done just once and don't require
    // rendering / rerendering the text objects

    // x1 and y1 - coordinates of the top left corner of the shape
    // initial width and height are the width and height of the shape
    // all the points are given as percentages of the slide
    const x1 = this.props.shape.points[0];
    const y1 = this.props.shape.points[1];
    const initialWidth = this.props.shape.points[2];
    const initialHeight = this.props.shape.points[3];

    // calculating the data for the outer rectangle
    // 0.001 is needed to accomodate bottom and right borders of the shape
    const x = x1 / 100 * this.props.slideWidth;
    const y = y1 / 100 * this.props.slideHeight;
    const width = (initialWidth - 0.001) / 100 * this.props.slideWidth;
    const height = (initialHeight - 0.001) / 100 * this.props.slideHeight;

    let votesTotal = 0;
    let maxNumVotes = 0;
    const textArray = [];

    // counting the total number of votes, finding the biggest number of votes
    this.props.shape.result.reduce((previousValue, currentValue, currentIndex, array) => {
      votesTotal = previousValue + currentValue.numVotes;
      if (maxNumVotes < currentValue.numVotes) {
        maxNumVotes = currentValue.numVotes;
      }

      return votesTotal;
    }, 0);

    // filling the textArray with data to display
    // adding value of the iterator to each line needed to create unique
    // keys while rendering at the end
    const arrayLength = this.props.shape.result.length;
    for (let i = 0; i < arrayLength; ++i) {
      const _tempArray = [];
      const _result = this.props.shape.result[i];
      _tempArray.push(_result.key, `${_result.numVotes}`);
      if (votesTotal === 0) {
        _tempArray.push('0%');
        _tempArray.push(i);
      } else {
        const percResult = _result.numVotes / votesTotal * 100;
        _tempArray.push(`${Math.round(percResult)}%`);
        _tempArray.push(i);
      }

      textArray.push(_tempArray);
    }

    // calculating the data for the inner rectangle
    const innerWidth = width * 0.95;
    const innerHeight = height - width * 0.05;
    const innerX = x + width * 0.025;
    const innerY = y + width * 0.025;
    const thickness = (width - innerWidth) / 10;

    // calculating the maximum possible width and height of the each line
    // 25% of the height goes to the padding
    const maxLineWidth = innerWidth / 3;
    const maxLineHeight = innerHeight * 0.75 / textArray.length;

    const lineToMeasure = textArray[0];

    // saving all the initial calculations in the state
    this.setState({
      outerRect: {
        x,
        y,
        width,
        height,
      },
      innerRect: {
        x: innerX,
        y: innerY,
        width: innerWidth,
        height: innerHeight,
      },
      thickness,
      votesTotal,
      maxNumVotes,
      textArray,
      maxLineWidth,
      maxLineHeight,
      lineToMeasure,
    });
  }

  componentDidMount() {
    this.checkSizes();
  }

  componentDidUpdate() {
    if (this.state.prepareToDisplay) {
      this.checkSizes();
    }
  }

  checkSizes() {
    const maxLineWidth = this.state.maxLineWidth;
    let maxLineHeight = this.state.maxLineHeight;

    // calculating the font size in this if / else block
    if (this.state.fontSizeDirection != 0) {
      const key = `${this.props.shape.id}_key_${this.state.currentLine}`;
      const votes = `${this.props.shape.id}_votes_${this.state.currentLine}`;
      const percent = `${this.props.shape.id}_percent_${this.state.currentLine}`;
      const keySizes = findDOMNode(this[key]).getBBox();
      const voteSizes = findDOMNode(this[votes]).getBBox();
      const percSizes = findDOMNode(this[percent]).getBBox();

      // first check if we can still increase the font-size
      if (this.state.fontSizeDirection == 1) {
        if (keySizes.width < maxLineWidth && keySizes.height < maxLineHeight &&
          voteSizes.width < maxLineWidth && voteSizes.height < maxLineHeight &&
          percSizes.width < maxLineWidth && percSizes.height < maxLineHeight) {
          return this.setState({
            calcFontSize: this.state.calcFontSize + 1,
          });

          // we can't increase font-size anymore, start decreasing
        }
        return this.setState({
          fontSizeDirection: -1,
          calcFontSize: this.state.calcFontSize - 1,
        });
      } else if (this.state.fontSizeDirection == -1) {
        // check if the font-size is still bigger than allowed
        if (keySizes.width > maxLineWidth || keySizes.height > maxLineHeight ||
          voteSizes.width > maxLineWidth || voteSizes.height > maxLineHeight ||
          percSizes.width > maxLineWidth || percSizes.height > maxLineHeight) {
          return this.setState({
            calcFontSize: this.state.calcFontSize - 1,
          });

          // font size is fine for the current line, switch to the next line
          // or finish with the font-size calculations if this we are at the end of the array
        }
        if (this.state.currentLine < this.state.textArray.length - 1) {
          return this.setState({
            currentLine: this.state.currentLine + 1,
            lineToMeasure: this.state.textArray[this.state.currentLine + 1],
          });
        }
        return this.setState({
          fontSizeDirection: 0,
          currentLine: 0,
          lineToMeasure: this.state.textArray[0],
        });
      }
    }

    // next block is executed when we finally found a proper font size

    // finding the biggest width and height of the left and right strings,
    // max real line height and max width value for 1 digit
    let maxLeftWidth = 0;
    let maxRightWidth = 0;
    maxLineHeight = 0;
    for (let i = 0; i < this.state.textArray.length; ++i) {
      const key = `${this.props.shape.id}_key_${i}`;
      const percent = `${this.props.shape.id}_percent_${i}`;
      const keySizes = findDOMNode(this[key]).getBBox();
      const percSizes = findDOMNode(this[percent]).getBBox();

      if (keySizes.width > maxLeftWidth) {
        maxLeftWidth = keySizes.width;
      }

      if (percSizes.width > maxRightWidth) {
        maxRightWidth = percSizes.width;
      }

      if (keySizes.height > maxLineHeight) {
        maxLineHeight = keySizes.height;
      }

      if (percSizes.height > maxLineHeight) {
        maxLineHeight = percSizes.height;
      }
    }

    const digitRef = `${this.props.shape.id}_digit`;
    const maxDigitWidth = findDOMNode(this[digitRef]).getBBox().width;
    const maxDigitHeight = findDOMNode(this[digitRef]).getBBox().height;

    this.setState({
      maxLeftWidth,
      maxRightWidth,
      maxLineHeight,
      maxDigitWidth,
      maxDigitHeight,
      prepareToDisplay: false,
    });
  }

  renderPoll() {
    //* ********************************************************************************************
    //* *****************************************MAGIC NUMBER***************************************
    // There is no automatic vertical centering in SVG.
    // To center the text element we have to move it down by the half of its height.
    // But every text element has its own padding by default. The height we receive
    // by calling getBBox() includes padding, but the anchor point doesn't consider it.
    // This way the text element is moved down a little bit and we have to move it up a bit.
    // 1/6 of the maximum height of the digit seems to work fine.
    // Oleksandr Zhurbenko. June 22, 2016
    const magicNumber = this.state.maxDigitHeight / 6;

    // maximum height and width of the line bar
    const maxBarWidth = this.state.innerRect.width * 0.9 -
      this.state.maxLeftWidth -
      this.state.maxRightWidth;
    const barHeight = this.state.innerRect.height * 0.75 / this.state.textArray.length;

    // Horizontal padding
    const horizontalPadding = this.state.innerRect.width * 0.1 / 4;

    // Vertical padding
    const verticalPadding = this.state.innerRect.height * 0.25 / (this.state.textArray.length + 1);

    // Initial coordinates of the key column
    let yLeft = this.state.innerRect.y + verticalPadding + barHeight / 2 - magicNumber;
    const xLeft = this.state.innerRect.x + horizontalPadding + 1;

    // Initial coordinates of the line bar column
    const xBar = this.state.innerRect.x + this.state.maxLeftWidth + horizontalPadding * 2;
    let yBar = this.state.innerRect.y + verticalPadding;

    // Initial coordinates of the percentage column
    let yRight = this.state.innerRect.y + verticalPadding + barHeight / 2 - magicNumber;
    const xRight = this.state.innerRect.x +
      horizontalPadding * 3 +
      this.state.maxLeftWidth +
      this.state.maxRightWidth +
      maxBarWidth + 1;

    let yNumVotes = this.state.innerRect.y + verticalPadding - magicNumber;
    const extendedTextArray = [];
    for (let i = 0; i < this.state.textArray.length; i++) {
      if (this.state.maxNumVotes == 0 || this.props.shape.result[i].numVotes === 0) {
        barWidth = 1;
      } else {
        barWidth = this.props.shape.result[i].numVotes / this.state.maxNumVotes * maxBarWidth;
      }

      // coordinates and color of the text inside the line bar
      // xNumVotesDefault and xNumVotesMovedRight are 2 different x coordinates for the text
      // since if the line bar is too small then we place the number to the right of the bar
      const xNumVotesDefault = this.state.innerRect.x +
        this.state.maxLeftWidth +
        horizontalPadding * 2;
      const xNumVotesMovedRight = xNumVotesDefault +
        barWidth / 2 +
        this.state.maxDigitWidth / 2;

      let xNumVotes;
      let color;
      if (barWidth < this.state.maxDigitWidth + 8) {
        xNumVotes = xNumVotesMovedRight;
        color = '#333333';
      } else {
        xNumVotes = xNumVotesDefault;
        color = 'white';
      }

      extendedTextArray[i] =
        {
          key: `${this.props.shape.id}_${this.state.textArray[i][3]}`,
          keyColumn: {
            keyString: this.state.textArray[i][0],
            xLeft,
            yLeft,
          },
          barColumn: {
            votesString: this.state.textArray[i][1],
            xBar,
            yBar,
            barWidth,
            barHeight,
            yNumVotes,
            xNumVotes,
            color,
            numVotes: this.props.shape.result[i].numVotes,
          },
          percentColumn: {
            xRight,
            yRight,
            percentString: this.state.textArray[i][2],
          },
        };

      // changing the Y coordinate for all the objects
      yBar = yBar + barHeight + verticalPadding;
      yLeft = yLeft + barHeight + verticalPadding;
      yRight = yRight + barHeight + verticalPadding;
      yNumVotes = yNumVotes + barHeight + verticalPadding;
    }

    return (
      <g>
        <rect
          x={this.state.outerRect.x}
          y={this.state.outerRect.y}
          width={this.state.outerRect.width}
          height={this.state.outerRect.height}
          strokeWidth="0"
          fill={this.state.backgroundColor}
        />
        <rect
          x={this.state.innerRect.x}
          y={this.state.innerRect.y}
          width={this.state.innerRect.width}
          height={this.state.innerRect.height}
          stroke="#333333"
          fill={this.state.backgroundColor}
          strokeWidth={this.state.thickness}
        />
        <text
          x={this.state.innerRect.x}
          y={this.state.innerRect.y}
          fill="#333333"
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          textAnchor="start"
        >
          {extendedTextArray.map(line =>
            (<tspan
              x={line.keyColumn.xLeft}
              y={line.keyColumn.yLeft}
              dy={this.state.maxLineHeight / 2}
              key={`${line.key}_key`}
            >
              {line.keyColumn.keyString}
            </tspan>),
          )}
        </text>
        {extendedTextArray.map(line =>
          (<rect
            key={`${line.key}_bar`}
            x={line.barColumn.xBar}
            y={line.barColumn.yBar}
            width={line.barColumn.barWidth}
            height={line.barColumn.barHeight}
            stroke="#333333"
            fill="#333333"
            strokeWidth={this.state.thickness - 1}
          />),
        )}
        <text
          x={this.state.innerRect.x}
          y={this.state.innerRect.y}
          fill="#333333"
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          textAnchor="end"
        >
          {extendedTextArray.map(line =>
            (<tspan
              x={line.percentColumn.xRight}
              y={line.percentColumn.yRight}
              dy={this.state.maxLineHeight / 2}
              key={`${line.key}_percent`}
            >
              {line.percentColumn.percentString}
            </tspan>),
          )}
        </text>
        <text
          x={this.state.innerRect.x}
          y={this.state.innerRect.y}
          fill="#333333"
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
        >
          {extendedTextArray.map(line =>
            (<tspan
              x={line.barColumn.xNumVotes + line.barColumn.barWidth / 2}
              y={line.barColumn.yNumVotes + line.barColumn.barHeight / 2}
              dy={this.state.maxLineHeight / 2}
              key={`${line.key}_numVotes`}
              fill={line.barColumn.color}
            >
              {line.barColumn.numVotes}
            </tspan>),
          )}
        </text>
      </g>
    );
  }

  renderLine(line) {
    // this func just renders the strings for one line
    return (
      <g key={`${this.props.shape.id}_line_${line[3]}`}>
        <text
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          ref={(ref) => { this[`${this.props.shape.id}_key_${line[3]}`] = ref; }}
        >
          <tspan>
            {line[0]}
          </tspan>
        </text>
        <text
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          ref={(ref) => { this[`${this.props.shape.id}_votes_${line[3]}`] = ref; }}
        >
          <tspan>
            {line[1]}
          </tspan>
        </text>
        <text
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          ref={(ref) => { this[`${this.props.shape.id}_percent_${line[3]}`] = ref; }}
        >
          <tspan>
            {line[2]}
          </tspan>
        </text>
      </g>
    );
  }

  renderTestStrings() {
    // check whether we need to render just one line (which means we still calculating the font-size)
    // or if we finished with the font-size and we need to render all the strings in order to
    // determine the maxHeight, maxWidth and maxDigitWidth
    if (this.state.fontSizeDirection != 0) {
      return this.renderLine(this.state.lineToMeasure);
    }
    return (
      <g>
        {this.state.textArray.map(line =>
          this.renderLine(line),
        )
        }
        <text
          fontFamily="Arial"
          fontSize={this.state.calcFontSize}
          ref={(ref) => { this[`${this.props.shape.id}_digit`] = ref; }}
        >
          <tspan>
            0
          </tspan>
        </text>
      </g>
    );
  }

  render() {
    return (
      <g>
        {this.state.prepareToDisplay ?
          this.renderTestStrings()
          :
          this.renderPoll()
        }
      </g>
    );
  }
}
