import React, { Component } from "react";
import { connect } from "react-redux";
import { WidthProvider, Responsive } from "react-grid-layout";
import PropTypes from "prop-types";
import axios from "axios";
import _ from "lodash";
import { deleteDashboard } from "../../actions/companyActions";
import TitleBar from "../bars/TitleBar";
import Clock from "../gridItems/Clock";
import Weather from "../gridItems/Weather";
import WidgetSelecter from "./WidgetSelecter";
import EditDashboardTitle from "./EditDashboardTitle";
import BackButton from "./Backbutton";
import Loader from "../common/Loader";

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const layout = [];

/* This class generates the layout for the web app. It renders the grid
 * and it's items, but also the side navigation with button's and a dropdown menu, to control the grid.
 */
class DashboardEdit extends Component {
  constructor(props) {
    super(props);
    const { handle } = this.props.match.params;
    this.state = {
      items: layout.map(function(i, key, list) {
        return {
          i: layout[key].i,
          x: layout[key].x,
          y: layout[key].y,
          w: layout[key].w,
          h: layout[key].h,
          widget: layout[key].widget,
          minW: layout[key].minW,
          minH: layout[key].minH,
          maxH: layout[key].maxH
        };
      }),
      selectedOption: { value: "", label: "Select a widget" },
      dashboard: {
        valid: false,
        company_id: "",
        id: "",
        handle,
        name: ""
      },
      company: {
        id: "",
        handle: "",
        name: ""
      },
      name: "",
      handle,
      inputNameActive: false,
      inputHandleActive: false,
      loaded: false
    };

    const { loaded } = this.state;
    const { history } = this.props;

    if (!loaded) {
      axios.get(`/api/company/all`).then(res => {
        const companies = res.data;
        axios.get(`/api/dashboard/all`).then(res => {
          const dashboards = res.data;

          Object.entries(dashboards).forEach(([key, value]) => {
            if (value.handle === this.state.dashboard.handle) {
              if (value.content.length > 0) {
                var items = JSON.parse(value.content);
                for (var i = 0; i < items.length; i++) {
                  if (items[i].y === null) {
                    items[i].y = Infinity;
                  }
                }
                this.setState({
                  items
                });
              }

              this.setState({
                dashboard: {
                  valid: true,
                  company_id: value.company,
                  id: value._id,
                  handle: value.handle,
                  name: value.name
                },
                name: value.name,
                handle: value.handle,
                loaded: true
              });

              document.title = `${
                this.state.dashboard.name
              } | Laméco Dashboard`;
            }
          });

          if (this.state.dashboard.valid) {
            Object.entries(companies).forEach(([key, value]) => {
              if (value._id === this.state.dashboard.company_id) {
                this.setState({
                  company: {
                    id: value._id,
                    handle: value.handle,
                    name: value.name
                  }
                });
              }
            });
          } else {
            history.push("/");
          }
        });
      });
    }
  }

  /* This function renders all grid items in the layout array. It creates a div
   * with a remove button, and content. The content managed by a switch statement,
   * which output is based on the widget property from the grid items.
   */
  createElement = el => {
    const removeStyle = {
      position: "absolute",
      right: 10,
      top: 5,
      cursor: "pointer"
    };
    const i = el.i;
    const widget = el.widget;

    return (
      <div key={i} data-grid={el}>
        {(() => {
          switch (widget) {
            case "Clock":
              return <Clock />;
            case "Photo":
              return <div className="photo" />;
            case "Weather":
              return <Weather />;
            default:
              return <div className="textWidget">{widget}</div>;
          }
        })()}
        <span
          className="remove"
          style={removeStyle}
          onClick={this.onRemoveItem.bind(this, i)}
        >
          x
        </span>
      </div>
    );
  };

  /* The onAddItem() function is called when the user clicks on the 'Add Item' button.
   * It adds a new grid item to the state, and takes the selected item in the dropmenu
   * into account. This way the correct widget is loaded by the createElement() function.
   */
  onAddItem = () => {
    const { selectedOption, items, cols } = this.state;

    var selection = selectedOption ? selectedOption : false;

    if (selectedOption.value !== "") {
      var widgetProps = returnProps(selection.value);

      var identifier = "";
      var possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 10; i++)
        identifier += possible.charAt(
          Math.floor(Math.random() * possible.length)
        );

      this.setState({
        items: items.concat({
          i: identifier,
          x: (items.length * 2) % (cols || 12),
          y: Infinity,
          w: widgetProps.w,
          h: widgetProps.h,
          widget: selection ? selection.value : "",
          minW: widgetProps.minW,
          minH: widgetProps.minH,
          maxH: widgetProps.maxH
        }),
        selectedOption: { value: "", label: "Select a widget" }
      });
    }
  };

  /* onLayoutReset() is called when the user clicks on the 'Reset Layout' button.
   * It clears the localStorage and then issues a window refresh.
   */
  onLayoutReset = () => {
    const { items, dashboard } = this.state;

    // Remove content from grid && database
    saveToDB(items, dashboard.handle, true);
    this.setState({
      items: layout.map(function(i, key, list) {
        return {
          i: layout[key].i,
          x: layout[key].x,
          y: layout[key].y,
          w: layout[key].w,
          h: layout[key].h,
          widget: layout[key].widget,
          minW: layout[key].minW,
          minH: layout[key].minH,
          maxH: layout[key].maxH
        };
      })
    });
  };

  /* Calls back with breakpoint and new # cols */
  onBreakPointChange = (breakpoint, cols) => {
    this.setState({
      breakpoint: breakpoint,
      cols: cols
    });
  };

  /* Is called whenever the layout is changed. The for loop adds widget attribute
   * from items array to objects in layout array, so that the widget props
   * are also saved to localStorage. This is because objects in the layout array
   * do not include a widget property by default.
   */
  onLayoutChange = layout => {
    const { items, dashboard } = this.state;

    this.setState({ layout: layout });
    for (var i = 0; i < items.length; i++) {
      layout[i].widget = items[i].widget;
    }
    saveToDB(layout, dashboard.handle, false);
  };

  /* When a user presses the little 'x' in the top right corner of a grid item,
   * this function is called. It removes the corresponding grid item.
   */
  onRemoveItem = i => {
    const { items, dashboard } = this.state;

    this.setState({ items: _.reject(items, { i: i }) });
    if (items.length === 1) {
      saveToDB(items, dashboard.handle, true);
    }
  };

  /* handleChange passes the selected dropdown item to the state. */
  handleChange = selectedOption => {
    this.setState({ selectedOption });
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onClick = e => {
    const { inputNameActive, inputHandleActive } = this.state;
    const { id } = e.target;

    if (id === "dashboardNicon") {
      if (!inputNameActive) {
        document.getElementById("dashboardNinput").focus();
        document.getElementById("dashboardNicon").textContent = "check";
        this.setState({ inputNameActive: true });
      }
    } else if (id === "dashboardHicon") {
      if (!inputHandleActive) {
        document.getElementById("dashboardHinput").focus();
        document.getElementById("dashboardHicon").textContent = "check";
        this.setState({ inputHandleActive: true });
      }
    }
  };

  onFocus = e => {
    const { inputNameActive, inputHandleActive } = this.state;
    const { id } = e.target;

    if (id === "dashboardNinput") {
      if (!inputNameActive) {
        document.getElementById("dashboardNicon").textContent = "check";
        this.setState({ inputNameActive: true });
      }
    } else if (id === "dashboardHinput") {
      if (!inputHandleActive) {
        document.getElementById("dashboardHicon").textContent = "check";
        this.setState({ inputHandleActive: true });
      }
    }
  };

  onBlur = e => {
    const { history } = this.props;
    const target = e.target.name;
    var value = e.target.value;

    if (target === "name") {
      value = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map(x => x.charAt(0).toUpperCase() + x.substring(1))
        .join(" ");

      this.setState({ [target]: value });

      const { dashboard, name, handle } = this.state;

      saveDashboardToDB({
        id: dashboard.id,
        name,
        handle,
        company: dashboard.company_id
      });

      document.title = `${value} | Laméco Dashboard`;
    } else if (target === "handle") {
      value = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");

      this.setState({ [target]: value });

      const { dashboard, name, handle } = this.state;

      saveDashboardToDB({
        id: dashboard.id,
        name: name,
        handle: handle,
        company: dashboard.company_id
      });

      history.push(`/dashboard-edit/${value}`);
    }

    setTimeout(
      function() {
        try {
          document.getElementById("dashboardNicon").textContent = "edit";
          document.getElementById("dashboardHicon").textContent = "edit";
          this.setState({ inputNameActive: false, inputHandleActive: false });
        } catch (error) {}
      }.bind(this),
      100
    );
  };

  onKeyDown = e => {
    const { id } = e.target;
    const { key } = e;

    if (key === "Enter" || key === "Escape" || key === "Esc") {
      if (id === "dashboardNinput") {
        document.getElementById("dashboardNinput").blur();
      } else if (id === "dashboardHinput") {
        document.getElementById("dashboardHinput").blur();
      }
    }
  };

  onDashboardDelete = () => {
    const { dashboard } = this.state;
    const { deleteDashboard, history } = this.props;

    deleteDashboard(dashboard.id);
    history.push("/");
  };

  /* This render function, renders the grid, dropdown-menu, 'Add Item'-button
   * and 'Reset Layout'-button. This is also where the createElement() function
   * is called for each grid item.
   */
  render() {
    const { selectedOption, items, loaded, company, name, handle } = this.state;
    const { history } = this.props;

    let grid;
    if (!loaded) {
      grid = (
        <div className="loader-center">
          <Loader />
        </div>
      );
    } else {
      if (items.length > 0) {
        grid = (
          <ResponsiveReactGridLayout
            onLayoutChange={this.onLayoutChange}
            onBreakPointChange={this.onBreakPointChange}
            {...this.props}
          >
            {_.map(items, el => this.createElement(el))}
          </ResponsiveReactGridLayout>
        );
      } else {
        grid = <div className="noItems">No widgets on the dashboard yet.</div>;
      }
    }

    return (
      <div className="dashboardEdit">
        <TitleBar />
        <div className="mainContainer">
          <div className="sideNav shadow2">
            <BackButton history={history} />
            <EditDashboardTitle
              onChange={this.onChange}
              onBlur={this.onBlur}
              onFocus={this.onFocus}
              onClick={this.onClick}
              onKeyDown={this.onKeyDown}
              company={company}
              name={name}
              handle={handle}
            />
            <WidgetSelecter
              selectedOption={selectedOption}
              handleChange={this.handleChange}
              onAddItem={this.onAddItem}
              onLayoutReset={this.onLayoutReset}
              onDashboardDelete={this.onDashboardDelete}
            />
          </div>
          <div className="dashboardGrid">{grid}</div>
        </div>
      </div>
    );
  }
}

/* Save layout to database. */
function saveToDB(content, handle, reset) {
  if (content.length <= 0) {
    content = "";
  } else if (reset) {
    content = "";
  } else {
    content = JSON.stringify(content);
  }

  axios.post(`/api/dashboard/update/layout/${handle}`, {
    content
  });
}

/* Save dashboard to database. */
function saveDashboardToDB(dashboard) {
  axios.post(`/api/dashboard/update/${dashboard.id}`, dashboard);
}

/* returnProps function returns widget-specific properties like width, min width,
 * heigth, etc.
 */
function returnProps(selection) {
  switch (selection) {
    case "Clock":
      return {
        w: 1.5,
        h: 1,
        minW: 1.5,
        minH: 1,
        maxH: 1000
      };
    case "Weather":
      return {
        w: 3,
        h: 3,
        minW: 3,
        minH: 3,
        maxH: 3
      };
    default:
      return {
        w: 2,
        h: 2,
        minW: 1,
        minH: 1,
        maxH: 1000
      };
  }
}

DashboardEdit.propTypes = {
  deleteDashboard: PropTypes.func.isRequired
};

DashboardEdit.defaultProps = {
  className: "layout",
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight: 100,
  autoSize: true
};

export default connect(
  null,
  { deleteDashboard }
)(DashboardEdit);
