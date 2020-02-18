---
layout: "post"
title:  "认识 AutoLayout"
date:  2017-07-11 17:15:43
categories: [杂项]
tags: [小试牛刀]

---

iOS 关于 AutoLayout 的初级探索

## AutoLayout 是什么？

首先看字面意思就是自动布局，AutoLayout 讲的就是 iOS 中对于视图布局的自动布局。那么视图如何选择使用 autolayout 呢？ 简单地说，它是通过约束来实现的。 约束就告诉自动布局引擎，我们希望它在此视图上执行布局以及布置视图的方式。 那么现在我们了解一下什么是约束。

### Constraints（约束）

NSLayoutConstraint 是继承自 NSObject 的一个类，也就是用来做约束的一个类。约束是对于视图而言的。 视图可以有许多约束, 那么我们怎么给视图添加或者移除约束呢？

现在来说两种方法给视图添加或者移除约束：

**第一种方法：**  通过 UIView 的实例方法来添加和移除自身的约束：（UIView 扩展方法）

```objc
@interface UIView (UIConstraintBasedLayoutInstallingConstraints)

@property(nonatomic,readonly) NSArray<__kindof NSLayoutConstraint *> *constraints NS_AVAILABLE_IOS(6_0);

- (void)addConstraint:(NSLayoutConstraint *)constraint NS_AVAILABLE_IOS(6_0); // This method will be deprecated in a future release and should be avoided.  Instead, set NSLayoutConstraint's active property to YES.

- (void)addConstraints:(NSArray<__kindof NSLayoutConstraint *> *)constraints NS_AVAILABLE_IOS(6_0); // This method will be deprecated in a future release and should be avoided.  Instead use +[NSLayoutConstraint activateConstraints:].

- (void)removeConstraint:(NSLayoutConstraint *)constraint NS_AVAILABLE_IOS(6_0); // This method will be deprecated in a future release and should be avoided.  Instead set NSLayoutConstraint's active property to NO.

- (void)removeConstraints:(NSArray<__kindof NSLayoutConstraint *> *)constraints NS_AVAILABLE_IOS(6_0); // This method will be deprecated in a future release and should be avoided.  Instead use +[NSLayoutConstraint deactivateConstraints:].

@end
```



```swift
extension UIView {
  @available(iOS 6.0, *)
  open var constraints: [NSLayoutConstraint] { get }
    
  @available(iOS 6.0, *)
  open func addConstraint(_ constraint: NSLayoutConstraint)

  @available(iOS 6.0, *)
  open func addConstraints(_ constraints: [NSLayoutConstraint]) 

  @available(iOS 6.0, *)
  open func removeConstraint(_ constraint: NSLayoutConstraint)

  @available(iOS 6.0, *)
  open func removeConstraints(_ constraints: [NSLayoutConstraint]) 

}

```

**第二种方法:** 通过 NSLayoutConstraint 的一个类方法来给视图添加约束，具体如下： 在看 NSLayoutConstraint 的实例化方法的时候，会发现他还有类方法，我们看下面两个方法：

```objc
@property (getter=isActive) BOOL active NS_AVAILABLE(10_10, 8_0);

/* Convenience method that activates each constraint in the contained array, in the same manner as setting active=YES. This is often more efficient than activating each constraint individually. */
+ (void)activateConstraints:(NSArray<NSLayoutConstraint *> *)constraints NS_AVAILABLE(10_10, 8_0);

/* Convenience method that deactivates each constraint in the contained array, in the same manner as setting active=NO. This is often more efficient than deactivating each constraint individually. */
+ (void)deactivateConstraints:(NSArray<NSLayoutConstraint *> *)constraints NS_AVAILABLE(10_10, 8_0);

```



```swift
// 添加约束
  @available(iOS 8.0, *)
  open class func activate(_ constraints:
                                      [NSLayoutConstraint])


// 移除约束
  @available(iOS 8.0, *)
  open class func deactivate(_ constraints:
                                      [NSLayoutConstraint])

```

### *实例化 NSLayoutConstraint*

我们可以看到以上两种方法都需要一个 NSLayoutConstraint 类型的参数，如何实例化一个 NSLayoutConstraint 对象呢？ 那么我们来看一下 NSLayoutConstraint 的初始化方法：

```objc

+(instancetype)constraintWithItem:(id)view1 
  						attribute:(NSLayoutAttribute)attr1 
    					relatedBy:(NSLayoutRelation)relation 
   			      toItem:(nullable id)view2 
        			attribute:(NSLayoutAttribute)attr2 
          		multiplier:(CGFloat)multiplier 
            	constant:(CGFloat)c;

```



```swift

public convenience init(   item view1:  Any, 
                      attribute attr1:  NSLayoutAttribute,            
                   relatedBy relation:  NSLayoutRelation, 
                         toItem view2:  Any?, attribute 
                                attr2:  NSLayoutAttribute, 
                           multiplier:  CGFloat, 
                           constant c:  CGFloat)       

```

初始化方法中有很多参数，接下来我们来讲一下各个参数的意义：

**item:** 可以看到他后边还有一个 view1 ，个人认为一般的他就是一个 UIView 或者其子类对象，是要进行约束的那个视图

**attribute:** 是一个 NSLayoutAttribute 枚举，可以看到他的枚举值有 left、right、bottom、top 等，这个参数就是第一个参数中 view 所要进行的约束的位置

**relatedBy:** 是一个 NSLayoutRelation 枚举，他的枚举值有 lessThanOrEqual（小于等于）、equal（等于）、 greaterThanOrEqual（大于等于）。 这个参数是用来指定 view1 和接下来那个参数 view2 两个视图之 间的约束关系的

**toItem:** 和第一个参数一样，这个主要就是来和第一个 view 做参照的那个 视图

**attribute:** 和第二个参数一样，是来表示第一个视图对第二个视图的 *参考位置* ，上下左右 还是 center 等

**multiplier:** 乘数的意思，CGFloat 类型。是来计算两个视图之间位置关系的 一个重要因素

**constant:** 常数， CGFloat 类型。也是计算两个视图位置关系的重要因素

这几个参数所构造出来的 NSLayoutConstraint 实例，添加到视图之后的位置关系到底是怎样的呢，可以用下面 ***这个公式*** 来计算得出：

item 的 attribute relatedBy toItem 的 attribute * multiplier + constant

简化之后就是：

```
 A 视图的 attribute  =  B视图的 attribute * multiplier + constant；
```

公式中的等于号可以根据 relatedBy 参数来变为 >= 或者 <=

接下来我们来实现添加约束

**第一种方法 view 的实例方法**

```swift
  let viewItem = UIView()
	// 一定要禁止 translatesAutoresizingMaskIntoConstraints
	viewItem.translatesAutoresizingMaskIntoConstraints = false
	viewItem.backgroundColor = .red
	// 必须先添加到 View上 然后再去做约束 因为约束如果要用到父视图 不提前添加 怎么知道谁是父视图
	view.addSubview(viewItem)
	//  添加和父视图view X 中心对齐 
	let centerXConstrains = NSLayoutConstraint( item: viewItem, 
                                           attribute: .centerX, 
                                           relatedBy: .equal, 
                                              toItem: view, 
                                           attribute: .centerX, 
                                          multiplier: 1, constant: 0)

	//  添加和父视图 Y 中心对其的约束
	let centerYConstrains = NSLayoutConstraint( item: viewItem,
                                           attribute: .centerY, 
                                           relatedBy: .equal, 
                                              toItem: view, 
                                           attribute: .centerY, 
                                          multiplier: 1, 
                                            constant: 0)

	//  添加和父视图 宽的关系 为1：2约束
	let heightConstrains = NSLayoutConstraint( item: viewItem, 
                                          attribute: .width , 
                                          relatedBy: .equal, 
                                             toItem: view, 
                                          attribute: .width, 
                                         multiplier: 1 / 2, 
                                           constant: 0)
	//  添加自身视图宽 高的关系 为1：1 的约束
	let widthConstrains = NSLayoutConstraint( item: viewItem,
                                         attribute: .height , 
                                         relatedBy: .equal,
					                        toItem:  viewItem, 
				                         attribute: .width, 
				                        multiplier: 1, 
					                      constant: 0)
	// 一定要分清楚约束是相对于谁加的  加给谁的
  //		view.addConstraint(centerXConstrains)
  //		view.addConstraint(centerYConstrains)
  //		view.addConstraint(heightConstrains)
	
// 此处可以向上边注释的那样一个一个添加，也可以以一个数组来一起添加	
view.addConstraints([centerXConstrains,
                     centerYConstrains,
                      heightConstrains])
viewItem.addConstraint(widthConstrains)


```

以上代码实现了一个中心点在父视图中心，宽等于父视图宽一半的一个正方形。细心的人会看到 addConstraint 方法有的是 view 调用，有的是 viewItem 调用。的确约束具体加给谁也是有原则的。

上面提到的 **translatesAutoresizingMaskIntoConstraints** 查官方文档，可以看到文档是这样介绍该属性的：`它是一个用来决定，是否将视图的自动调整大小的遮罩(autoresizing mask)转换为 Auto Layout 约束的布尔值。`   你是`不能给视图添加额外的约束`来修改它的位置或大小的，如果添加额外的约束会导致约束冲突。如果你想使用 Auto Layout 动态计算、改变视图尺寸的话，你必须将该属性值改为 false 。

通过文档介绍我们可以得知：当该属性为 true 时，系统会自动通过视图的 autoresizing mask 创建一组视图的约束，这些约束是基于你提供的 frame、bounds、center 这些属性。也就是说，当你给视图的 frame 赋值之后，它会为你创建静态的、基于 frame 的 Auto Layout 约束。

**具体总结如下：**

1. 如果两个视图（也就是参数 item 和 toItem）是父子关系，设置子控件的约束，约束添加到父控件上

2. 如果两个视图（也就是参数 item 和 toItem）是兄弟关系，设置两兄弟的约束，约束会添加到第一个共同的父控件上

3. 如果两个视图（也就是参数 item 和 toItem）是同一个视图，约束会添加到自己上

**使用第二种方法 ：NSLayoutConstraint 的类方法实现约束** 在上边我们看了 NSLayoutConstraint 的类方法，很明显他是 iOS8 之后才适用的，这个方法参数是一个 NSLayoutConstraint 数组。 那么 NSLayoutConstraint 的实例化和上边一样，只是最终加给视图约束的方法不同，具体实现如下：

```swift
let view1 = UIView()
view1.backgroundColor = UIColor.blue
view1.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(view1)
// view1 和 viewItem 的 Y 中心对称		
let topContrians = NSLayoutConstraint(item: view1,       
                                 attribute: .top,  
                                 relatedBy: .equal,
                                    toItem: viewItem, 
                                 attribute: .centerY, 
                                multiplier: 1, 
                                  constant: 0)
// view1 和 viewItem 的 bottom 对其				
let bottomContrians = NSLayoutConstraint(item: view1, 
                                    attribute: .bottom,
                                    relatedBy: .equal, 
                                       toItem: viewItem, 
                                    attribute: .bottom, 
                                   multiplier: 1, 
                                     constant: 0)
// view1 和 viewItem 的 width 相等	
let widthContrains = NSLayoutConstraint(item: view1, 
                                   attribute: .width, 
                                   relatedBy: .equal,
                                      toItem: viewItem, 
                                   attribute: .width, 
                                  multiplier: 1, 
                                    constant: 0)
// view1 和 viewItem 的 leading 对齐		
let leadingContrains = NSLayoutConstraint(item: view1, 
                                     attribute: .leading, 
                                     relatedBy: .equal, 
                                        toItem: viewItem, 
                                     attribute: .leading, 
                                    multiplier: 1, 
                                      constant: 0)
// iOS8 以后 NSLayoutConstraint 的类方法 也可以把约束添加到视图上，而且省掉了判断添加到那个视图上的问题，避免了上面例子中因为视图添加错误而导致的崩溃
   NSLayoutConstraint.activate([topContrians,bottomContrians,widthContrains,leadingContrains])

复制代码
```

最终添加给视图约束的方法就是这个类方法。

**Anchor notation 做约束**

从 iOS 9 开始，又一种新的方式来做约束。 其 *本质也是通过上边两种方法给视图添加约束*，只不过是获取 NSLayoutConstraint 的实例使用了 Anchor，就是通过 Anchor 来实现。

以下几个属性就是 View 的 Anchor notation 扩展，主要也是视图的上下左右等约束点的 Anchor

```swift
extension UIView {

    @available(iOS 9.0, *)
    open var leadingAnchor: NSLayoutXAxisAnchor { get }

    @available(iOS 9.0, *)
    open var trailingAnchor: NSLayoutXAxisAnchor { get }

    @available(iOS 9.0, *)
    open var leftAnchor: NSLayoutXAxisAnchor { get }

    @available(iOS 9.0, *)
    open var rightAnchor: NSLayoutXAxisAnchor { get }

    @available(iOS 9.0, *)
    open var topAnchor: NSLayoutYAxisAnchor { get }

    @available(iOS 9.0, *)
    open var bottomAnchor: NSLayoutYAxisAnchor { get }

    @available(iOS 9.0, *)
    open var widthAnchor: NSLayoutDimension { get }

    @available(iOS 9.0, *)
    open var heightAnchor: NSLayoutDimension { get }

    @available(iOS 9.0, *)
    open var centerXAnchor: NSLayoutXAxisAnchor { get }

    @available(iOS 9.0, *)
    open var centerYAnchor: NSLayoutYAxisAnchor { get }

    @available(iOS 9.0, *)
    open var firstBaselineAnchor: NSLayoutYAxisAnchor { get }

    @available(iOS 9.0, *)
    open var lastBaselineAnchor: NSLayoutYAxisAnchor { get }
}

```

可以看到 View 的 Anchor 属性都是 NSLayoutYAxisAnchor 类型的 继承自 NSLayoutAnchor，那么 NSLayoutAnchor 是什么呢？

```swift
@available(iOS 9.0, *)
open class NSLayoutAnchor<AnchorType : AnyObject> : NSObject {

    open func constraint(equalTo anchor: 
           NSLayoutAnchor<AnchorType>) -> NSLayoutConstraint

    open func constraint(greaterThanOrEqualTo anchor: 
           NSLayoutAnchor<AnchorType>) -> NSLayoutConstraint

    open func constraint(lessThanOrEqualTo anchor:
           NSLayoutAnchor<AnchorType>) -> NSLayoutConstraint

    open func constraint(equalTo anchor: 
            NSLayoutAnchor<AnchorType>,
                  constant c: CGFloat) -> NSLayoutConstraint

    open func constraint(greaterThanOrEqualTo anchor: 
            NSLayoutAnchor<AnchorType>,
                  constant c: CGFloat) -> NSLayoutConstraint

    open func constraint(lessThanOrEqualTo anchor: 
          NSLayoutAnchor<AnchorType>,
                  constant c: CGFloat) -> NSLayoutConstraint
}

@available(iOS 9.0, *)
open class NSLayoutXAxisAnchor:
               NSLayoutAnchor<*NSLayoutXAxisAnchor*> {
        }

```

NSLayoutXAxisAnchor 就是 NSLayoutAnchor 的一个子类，NSLayoutAnchor 有 6 个 constraint 的方法，具体看一下参数就知道有什么区别了，这里就不一一赘述了。每个方法都可以返回一个 NSLayoutConstraint 类型的实例。那么我们就可以使用返回的实例，利用上边的两种方法给视图添加约束了，具体如下：（此处用的 第二种类方法）

```swift
let view2 = UIView()
view.addSubview(view2)
view2.translatesAutoresizingMaskIntoConstraints = false
view2.backgroundColor = UIColor.blue	
NSLayoutConstraint.activate(

[view2.leadingAnchor.constraint(equalTo:   
                                 view1.leadingAnchor),

view2.trailingAnchor.constraint(equalTo:
                                 view1.trailingAnchor),

view2.topAnchor.constraint(equalTo: 
                                 view1.bottomAnchor),

view2.heightAnchor.constraint(equalTo: 
                                 view1.heightAnchor)])

```

### Visual format natation 来做约束

**visual format** 是一种基于文本来缩略的创建约束的速记（简写）方法 ，具有 允许同时描述多个约束的优点，并且特别适合于当水平或垂直地布置一系列视图的情况。 例子："V:|[v2(10)]"

**各个符号的意义：**

V：表示正在的垂直维度; 如果是 H：水平维度

**|**：竖线（|）表示父视图

**v2**: 视图的名称显示在方括号中，v2 就是视图的名称

**10**：视图名称之后的小括号中的数字，表示视图的大小。 V 的话就是高，H 就是宽，根据视图的排列方向而定

那么怎么样使用 visual format 呢？ 我们来看一下 NSLayoutConstraint 的另一个类方法：

```
 open class func constraints(withVisualFormat
                         format: String, 
                   options opts: NSLayoutFormatOptions = [],
                        metrics: [String : Any]?, 
                views: [String : Any])-> [NSLayoutConstraint]
复制代码
```

这个类方法最终返回了一个 NSLayoutConstraint 数组，那么我们又可以使用上边的两个方法给视图添加约束了

要使用 visual format，必须提供一个字典，将 visual format 字符串提到的每个视图的字符串名称对应到实际视图，例如：

创建两个视图 v1 和 v2：

```swift
	    let v1 = UIView()
		v1.backgroundColor = UIColor.blue
		v1.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(v1)
		
		let v2 = UIView()
		v2.backgroundColor = UIColor.cyan
		v2.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(v2)
```

然后就创建所谓的字典：

```swift
// 字典d 就是将字符串 v1对应实际的视图 v1 ,"v2"对应 v2.了解字典的就很
   容易懂什么意思
let d = ["v1":v1,"v2": v2]

```

具体使用我们通过一段代码来看：(以下代码中注释是对方法的第一个 String 类型的参数做出的解释)

```swift
	NSLayoutConstraint.activate([

  //左右两边都有 | 就是说水平方向父视图的两边 距离都为零
	NSLayoutConstraint.constraints(withVisualFormat:
				"H:|[v1]|", metrics: nil, views: d), 

  // 左边有 | 就是说竖直方向父视图的上方  距离为0 高度为100
	NSLayoutConstraint.constraints(withVisualFormat:
				"V:|[v1(100)]", metrics: nil, views: d),  

  // 左边有 | 就是说水平方向 距离父视图的左边为0 且宽度为140
	NSLayoutConstraint.constraints(withVisualFormat:
				"H:|[v2(40)]", metrics: nil, views: d),

  // 右边有 | 就是说竖直方向距离父视图下方为40 高度为120
	NSLayoutConstraint.constraints(withVisualFormat:
				"V:[v2]-(40)-|", metrics: nil, views: d), 

  // 没有  |（竖线），也就是说这个约束和父视图没有关系了。
    是[v1]-0-[v2]这样的一个形式，这说的是V(竖直)方向上v1和v2相聚为20
	NSLayoutConstraint.constraints(withVisualFormat: 
  "V:[v1]-20-[v2]", metrics: nil, views: d)].flatMap{$0})

```

上边这种方法不常用，也就不做太多的解释了

## 总结

AutoLayout 就是要用约束来实现的，既然要用约束就离不开 NSLayoutConstraint 这个类，最终得到 NSLayoutConstraint 的类实例，然后通过上边的两种方法任何一种就可以把约束添加到视图上，完成自动布局了。

建议还是用类方法，出错的概率更低一些。

布局约束的重要计算公式：

```
 View1 = View2 * multiplier + constant
```

如果你会 StoryBoard 随便拖进去一个控件做约束： 可以看到约束的这个界面，一目了然:

![img](https://user-gold-cdn.xitu.io/2017/12/29/160a1d6c44cd2677?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

哪两个视图 (ViewItem 和 SuperView) 在做约束， 参考的是视图的哪个位置(CenterY)， 两个视图之间的关系（Equal） 常量关系（Constant） 优先级 （Priority） 倍数关系 (Multiplier)

计算公式：

```
    First Item  =  Second Item  *  Multiplier   +   Constant
```

全文完
