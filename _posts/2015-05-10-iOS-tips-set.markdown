---
title:  "knowledge "
date:   2015-05-10 18:22:03
categories: [杂项]
tags: [能工巧匠]
---
一直想做这样一个小册子，来记录自己平时开发、阅读博客、看书、代码分析和与人交流中遇到的各种问题。之前有过这样的尝试，但都是无疾而终。不过，每天接触的东西多，有些东西不记下来，忘得也是很快，第二次遇到同样的问题时，还得再查一遍。好记性不如烂笔头，所以又决定重拾此事，时不时回头看看，温故而知新。

这里面的每个问题，不会太长。或是读书笔记，或是摘抄，亦或是验证，每个问题的篇幅争取在六七百字的样子。笔记和摘抄的出处会详细标明。问题的个数不限，凑齐3000字左右就发一篇。争取每月至少发两篇吧，权当是对自己学习的一个整理。

本期主要记录了以下几个问题：

* `NSString`属性什么时候用copy，什么时候用strong?
* `Foundation`中的断言处理
* `IBOutletCollection`递归锁的使用
* `NSRecursiveLock`
* `NSHashTable`

####NSString属性什么时候用copy，什么时候用strong?

我们在声明一个`NSString`属性时，对于其内存相关特性，通常有两种选择(基于`ARC`环境)：`strong`与`copy`。那这两者有什么区别呢？什么时候该用`strong`，什么时候该用`copy`呢？让我们先来看个例子。
####示例
我们定义一个类，并为其声明两个字符串属性，如下所示：

```
@interface TestStringClass ()
@property (nonatomic, strong) NSString *strongString;
@property (nonatomic, copy) NSString *copyedString;
@end
```

上面的代码声明了两个字符串属性，其中一个内存特性是strong，一个是copy。下面我们来看看它们的区别。

首先，我们用一个不可变字符串来为这两个属性赋值，

```
- (void)test {
    NSString *string = [NSString stringWithFormat:@"abc"];
    self.strongString = string;
    self.copyedString = string;
    NSLog(@"origin string: %p, %p", string, &string);
    NSLog(@"strong string: %p, %p", strongString, &strongString);
    NSLog(@"copy string: %p, %p", copyedString, &copyedString);
}
```
其输出结果是：  

```
origin string: 0x7fe441592e20, 0x7fff57519a48
strong string: 0x7fe441592e20, 0x7fe44159e1f8
copy string: 0x7fe441592e20, 0x7fe44159e200
```
我们要以看到，这种情况下，不管是`strong`还是`copy`属性的对象，其指向的地址都是同一个，即为`string`指向的地址。如果我们换作MRC环境，打印`string`的引用计数的话，会看到其引用计数值是3，即`strong`操作和`copy`操作都使原字符串对象的引用计数值加了1。

接下来，我们把`string`由不可变改为可变对象，看看会是什么结果。即将下面这一句  

```
NSString *string = [NSString stringWithFormat:@"abc"];

```
改成：   

```
NSMutableString *string = [NSMutableString stringWithFormat:@"abc"];

```
其输出结果是：  

```
origin string: 0x7ff5f2e33c90, 0x7fff59937a48
strong string: 0x7ff5f2e33c90, 0x7ff5f2e2aec8
copy string: 0x7ff5f2e2aee0, 0x7ff5f2e2aed0
```
可以发现，此时`copy`属性字符串已不再指向`string`字符串对象，而是深拷贝了`string`字符串，并让_copyedString对象指向这个字符串。在`MRC`环境下，打印两者的引用计数，可以看到`string`对象的引用计数是2，而`_copyedString`对象的引用计数是1。

此时，我们如果去修改string字符串的话，可以看到：因为`_strongString`与string是指向同一对象，所以`_strongString`的值也会跟随着改变(需要注意的是，此时`_strongString`的类型实际上是`NSMutableString`，而不是`NSString`)；而`_copyedString`是指向另一个对象的，所以并不会改变。
####结论

由于`NSMutableString`是`NSString`的子类，所以一个`NSString`指针可以指向`NSMutableString`对象，让我们的`strongString`指针指向一个可变字符串是OK的。

而上面的例子可以看出，当源字符串是NSString时，由于字符串是不可变的，所以，不管是`strong`还是`copy`属性的对象，都是指向源对象，copy操作只是做了次浅拷贝。

当源字符串是`NSMutableString`时，`strong`属性只是增加了源字符串的引用计数，而copy属性则是对源字符串做了次深拷贝，产生一个新的对象，且`copy`属性对象指向这个新的对象。另外需要注意的是，这个copy属性对象的类型始终是`NSString`，而不是`NSMutableString`，因此其是不可变的。

这里还有一个性能问题，即在源字符串是`NSMutableString`，`strong`是单纯的增加对象的引用计数，而copy操作是执行了一次深拷贝，所以性能上会有所差异。而如果源字符串是NSString时，则没有这个问题。

所以，在声明`NSString`属性时，到底是选择`strong`还是`copy`，可以根据实际情况来定。不过，一般我们将对象声明为`NSString`时，都不希望它改变，所以大多数情况下，我们建议用`copy`，以免因可变字符串的修改导致的一些非预期问题。

关于字符串的内存管理，还有些有意思的东西，可以参考[NSString特性分析学习](http://blog.cnbluebox.com/blog/2014/04/16/nsstringte-xing-fen-xi-xue-xi/)。

####Foundation中的断言处理

经常在看一些第三方库的代码时，或者自己在写一些基础类时，都会用到断言。所以在此总结一下Objective-C中关于断言的一些问题。

Foundation中定义了两组断言相关的宏，分别是

```
NSAssert / NSCAssert
NSParameterAssert / NSCParameterAssert
```

这两组宏主要在功能和语义上有所差别，这些区别主要有以下两点：

* 1,如果我们需要确保方法或函数的输入参数的正确性，则应该在方法(函数)的顶部使用`NSParameterAssert` / `NSCParameterAssert`；而在其它情况下，使用`NSAssert` / `NSCAssert`。
* 2,另一个不同是介于C和Objective-C之间。`NSAssert` / `NSParameterAssert`应该用于Objective-C的上下文(方法)中，而`NSCAssert` / `NSCParameterAssert`应该用于C的上下文(函数)中。
当断言失败时，通常是会抛出一个如下所示的异常：

```
*** Terminating app due to uncaught exception 'NSInternalInconsistencyException', reason: 'true is not equal to false'
```
Foundation为了处理断言，专门定义了一个`NSAssertionHandler`来处理断言的失败情况。`NSAssertionHandler`对象是自动创建的，用于处理失败的断言。当断言失败时，会传递一个字符串给`NSAssertionHandler`对象来描述失败的原因。每个线程都有自己的`NSAssertionHandler`对象。当调用时，一个断言处理器会打印包含方法和类(或函数)的错误消息，并引发一个`NSInternalInconsistencyException`异常。就像上面所看到的一样。

我们很少直接去调用`NSAssertionHandler`的断言处理方法，通常都是自动调用的。

`NSAssertionHandler`提供的方法并不多，就三个，如下所示：

```
// 返回与当前线程的NSAssertionHandler对象。
// 如果当前线程没有相关的断言处理器，则该方法会创建一个并指定给当前线程
+ (NSAssertionHandler *)currentHandler
// 当NSCAssert或NSCParameterAssert断言失败时，会调用这个方法
- (void)handleFailureInFunction:(NSString *)functionName file:(NSString *)object lineNumber:(NSInteger)fileName description:(NSString *)line, format,...
// 当NSAssert或NSParameterAssert断言失败时，会调用这个方法
- (void)handleFailureInMethod:(SEL)selector object:(id)object file:(NSString *)fileName lineNumber:(NSInteger)line description:(NSString *)format, ...

```
另外，还定义了一个常量字符串

```

NSString * const NSAssertionHandlerKey;
```
主要是用于在线程的`threadDictionary`字典中获取或设置断言处理器。

关于断言，还需要注意的一点是在Xcode 4.2以后，在`release`版本中断言是默认关闭的，这是由宏`NS_BLOCK_ASSERTIONS`来处理的。也就是说，当编译`release`版本时，所有的断言调用都是无效的。

我们可以自定义一个继承自NSAssertionHandler的断言处理类，来实现一些我们自己的需求。如Mattt Thompson的[NSAssertionHandler](http://nshipster.com/nsassertionhandler/)实例一样：

```
@interface LoggingAssertionHandler : NSAssertionHandler
@end
@implementation LoggingAssertionHandler
- (void)handleFailureInMethod:(SEL)selector
                       object:(id)object
                         file:(NSString *)fileName
                   lineNumber:(NSInteger)line
                  description:(NSString *)format, ...
{
    NSLog(@"NSAssert Failure: Method %@ for object %@ in %@#%i", NSStringFromSelector(selector), object, fileName, line);
}
- (void)handleFailureInFunction:(NSString *)functionName
                           file:(NSString *)fileName
                     lineNumber:(NSInteger)line
                    description:(NSString *)format, ...
{
    NSLog(@"NSCAssert Failure: Function (%@) in %@#%i", functionName, fileName, line);
}
@end
```
上面说过，每个线程都有自己的断言处理器。我们可以通过为线程的`threadDictionary`字典中的`NSAssertionHandlerKey`指定一个新值，来改变线程的断言处理器。

如下代码所示：

```
- (BOOL)application:(UIApplication *)application
didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSAssertionHandler *assertionHandler = [[LoggingAssertionHandler alloc] init];
  [[[NSThread currentThread] threadDictionary] setValue:assertionHandler
                                                 forKey:NSAssertionHandlerKey];
  // ...
  return YES;
}
```
而什么时候应该使用断言呢？通常我们期望程序按照我们的预期去运行时，如调用的参数为空时流程就无法继续下去时，可以使用断言。但另一方面，我们也需要考虑，在这加断言确实是需要的么？我们是否可以通过更多的容错处理来使程序正常运行呢？

Matt Thompson在[NSAssertionHandler](http://nshipster.com/nsassertionhandler/)中的倒数第二段说得挺有意思，在此摘抄一下：
>But if we look deeper into NSAssertionHandler—and indeed, into our own hearts, there are lessons to be learned about our capacity for kindness and compassion; about our ability to forgive others, and to recover from our own missteps. We can’t be right all of the time. We all make mistakes. By accepting limitations in ourselves and others, only then are we able to grow as individuals.

####IBOutletCollection

在IB与相关文件做连接时，我们经常会用到两个关键字：`IBOutlet`和`IBAction`。经常用`xib`或`storyboard`的童鞋应该用这两上关键字非常熟悉了。不过`UIKit`还提供了另一个伪关键字`IBOutletCollection`，我们使用这个关键字，可以将界面上一组相同的控件连接到同一个数组中。

我们先来看看这个伪关键字的定义，可以从`UIKit.framework`的头文件`UINibDeclarations.h`找到如下定义：

```
#ifndef IBOutletCollection
#define IBOutletCollection(ClassName)
#endif
```
另外，在Clang源码中，有更安全的定义方式，如下所示：


```
#define IBOutletCollection(ClassName) attribute((iboutletcollection(ClassName)))
```

从上面的定义可以看到，与`IBOutlet`不同的是，`IBOutletCollection`带有一个参数，该参数是一个类名。

通常情况下，我们使用一个`IBOutletCollection`属性时，属性必须是`strong`的，且类型是`NSArray`，如下所示：

```
@property (strong, nonatomic) IBOutletCollection(UIScrollView) NSArray *scrollViews;
```
假定我们的xib文件中有三个横向的`scrollView`，我们便可以将这三个`scrollView`都连接至`scrollViews`属性，然后在我们的代码中便可以做一些统一处理，如下所示：

```
- (void)setupScrollViewImages
{
    for (UIScrollView *scrollView in self.scrollViews) {
        [self.imagesData enumerateObjectsUsingBlock:^(NSString *imageName, NSUInteger idx, BOOL *stop) {
            UIImageView *imageView = [[UIImageView alloc] initWithFrame:CGRectMake(CGRectGetWidth(scrollView.frame) * idx, 0, CGRectGetWidth(scrollView.frame), CGRectGetHeight(scrollView.frame))];
            imageView.contentMode = UIViewContentModeScaleAspectFill;
            imageView.image = [UIImage imageNamed:imageName];
            [scrollView addSubview:imageView];
        }];
    }
}
```
这段代码会影响到三个`scrollView`。这样做的好处是我们不需要手动通过`addObject`:方法将`scrollView`添加到scrollViews中。

不过在使用`IBOutletCollection`时，需要注意两点：

* 1,`IBOutletCollection`集合中对象的顺序是不确定的。我们通过调试方法可以看到集合中对象的顺序跟我们连接的顺序是一样的。但是这个顺序可能会因为不同版本的Xcode而有所不同。所以我们不应该试图在代码中去假定这种顺序。
* 2,不管`IBOutletCollection`(ClassName)中的控件是什么，属性的类型始终是`NSArray`。实际上，我们可以声明是任何类型，如`NSSet`，`NSMutableArray`，甚至可以是`UIColor`，但不管我们在此设置的是什么类，`IBOutletCollection`属性总是指向一个`NSArray`数组。
关于第二点，我们以上面的`scrollViews`为例，作如下修改：

```
@property (strong, nonatomic) IBOutletCollection(UIScrollView) NSSet *scrollViews;
```
实际上我们在控制台打印这个scrollViews时，结果如下所示：

```
(lldb) po self.scrollViews
<__NSArrayI 0x1740573d0>(
<UIScrollView: 0x12d60d770; frame = (0 0; 320 162); clipsToBounds = YES; autoresize = W+H; gestureRecognizers = <NSArray: 0x1740574f0>; layer = <CALayer: 0x174229480>; contentOffset: {0, 0}; contentSize: {0, 0}>,
<UIScrollView: 0x12d60dee0; frame = (0 0; 320 161); clipsToBounds = YES; autoresize = W+H; gestureRecognizers = <NSArray: 0x174057790>; layer = <CALayer: 0x1742297c0>; contentOffset: {0, 0}; contentSize: {0, 0}>,
<UIScrollView: 0x12d60e650; frame = (0 0; 320 163); clipsToBounds = YES; autoresize = W+H; gestureRecognizers = <NSArray: 0x1740579a0>; layer = <CALayer: 0x1742298e0>; contentOffset: {0, 0}; contentSize: {0, 0}>
)
```
可以看到，它指向的是一个NSArray数组。

另外，IBOutletCollection实际上在iOS 4版本中就有了。不过，现在的Objective-C已经支持object literals了，所以定义数组可以直接用@[]，方便了许多。而且object literals方式可以添加不在xib中的用代码定义的视图，所以显得更加灵活。当然，两种方式选择哪一种，就看我们自己的实际需要和喜好了。

####NSRecursiveLock递归锁的使用
待续......
